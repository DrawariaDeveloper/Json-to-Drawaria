import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext
from pathlib import Path
import sys
import os # Importar os para basename y splitext

# Asegúrate de que las importaciones de tu core estén correctas
try:
    from core.image_processor import ImageToDrawaria
except ImportError:
    messagebox.showerror("Error de Importación", "No se pudo importar 'ImageToDrawaria'. "
                                                "Asegúrate de que 'image_processor.py' está en la carpeta 'core'.")
    sys.exit(1)

class ImageConverterApp:
    def __init__(self, master):
        self.master = master
        master.title("Image to Drawaria JSON Converter")
        master.geometry("600x750") # Tamaño de ventana ajustado para la lista
        master.resizable(False, False)

        main_frame = tk.Frame(master, padx=15, pady=15)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Variables de control con los nuevos valores por defecto
        self.input_files = [] # Almacenará las rutas completas de los archivos de entrada
        self.max_colors = tk.IntVar(value=12) # CAMBIADO a 12
        self.thickness = tk.IntVar(value=3) # CAMBIADO a 3
        self.scale = tk.DoubleVar(value=1.0) # La escala es ignorada si se usa exact_size
        self.quality = tk.StringVar(value="medium")
        self.exact_size_w = tk.StringVar(value="47.3218") # CAMBIADO a 47.3218
        self.exact_size_h = tk.StringVar(value="47.3218") # CAMBIADO a 47.3218

        # --- Widgets ---

        row_idx = 0

        # Input Files Selection
        tk.Label(main_frame, text="Imágenes de Entrada:").grid(row=row_idx, column=0, sticky="w", pady=(0, 5))
        tk.Button(main_frame, text="Añadir Imágenes...", command=self._add_input_files).grid(row=row_idx, column=1, sticky="ew", padx=(5,0), pady=(0, 5))
        tk.Button(main_frame, text="Limpiar Lista", command=self._clear_input_list).grid(row=row_idx, column=2, sticky="ew", padx=(5,0), pady=(0, 5))
        row_idx += 1

        # Listbox para mostrar los archivos seleccionados
        self.input_listbox = tk.Listbox(main_frame, height=8, selectmode=tk.SINGLE, bg="#222", fg="#eee", borderwidth=1, relief="solid")
        self.input_listbox.grid(row=row_idx, column=0, columnspan=3, sticky="nsew", pady=5)
        # Scrollbar para la Listbox
        listbox_scrollbar = tk.Scrollbar(main_frame, orient="vertical", command=self.input_listbox.yview)
        listbox_scrollbar.grid(row=row_idx, column=3, sticky="ns", pady=5)
        self.input_listbox.config(yscrollcommand=listbox_scrollbar.set)
        row_idx += 1


        # Parámetros de conversión (los mismos que antes, pero con valores iniciales cambiados)
        # Max Colors
        tk.Label(main_frame, text="Máximo de Colores (1-16):").grid(row=row_idx, column=0, sticky="w", pady=5)
        tk.Spinbox(main_frame, from_=1, to=16, textvariable=self.max_colors, width=5, justify="center").grid(row=row_idx, column=1, sticky="w", pady=5)
        row_idx += 1

        # Thickness
        tk.Label(main_frame, text="Grosor de Trazo (1-50):").grid(row=row_idx, column=0, sticky="w", pady=5)
        tk.Spinbox(main_frame, from_=1, to=50, textvariable=self.thickness, width=5, justify="center").grid(row=row_idx, column=1, sticky="w", pady=5)
        row_idx += 1

        # Scale
        tk.Label(main_frame, text="Escala (0.1-2.0):").grid(row=row_idx, column=0, sticky="w", pady=5)
        tk.Spinbox(main_frame, from_=0.1, to=2.0, increment=0.1, format="%.1f", textvariable=self.scale, width=5, justify="center").grid(row=row_idx, column=1, sticky="w", pady=5)
        row_idx += 1

        # Quality
        tk.Label(main_frame, text="Calidad de Contorno:").grid(row=row_idx, column=0, sticky="w", pady=5)
        quality_options = ["low", "medium", "high"]
        tk.OptionMenu(main_frame, self.quality, *quality_options).grid(row=row_idx, column=1, sticky="w", pady=5)
        row_idx += 1

        # Exact Size
        tk.Label(main_frame, text="Tamaño Exacto (WxH, ej. 67.3218x67.3218):").grid(row=row_idx, column=0, sticky="w", pady=5)
        exact_size_frame = tk.Frame(main_frame)
        exact_size_frame.grid(row=row_idx, column=1, sticky="w", pady=5)
        tk.Entry(exact_size_frame, textvariable=self.exact_size_w, width=9, justify="center").pack(side=tk.LEFT) # Ancho ajustado
        tk.Label(exact_size_frame, text="x").pack(side=tk.LEFT)
        tk.Entry(exact_size_frame, textvariable=self.exact_size_h, width=9, justify="center").pack(side=tk.LEFT) # Ancho ajustado
        tk.Label(main_frame, text="(Ignora escala si se usa)").grid(row=row_idx, column=2, sticky="w", padx=(5,0), pady=5)
        row_idx += 1

        # Convert Button
        tk.Button(main_frame, text="Convertir Todas las Imágenes a Drawaria JSON", command=self._process_and_export_all,
                  font=("Arial", 12, "bold"), bg="#4CAF50", fg="white").grid(row=row_idx, column=0, columnspan=4, pady=20, sticky="ew")
        row_idx += 1

        # Output Log
        tk.Label(main_frame, text="Registro de Salida:").grid(row=row_idx, column=0, sticky="w", pady=5)
        row_idx += 1
        self.output_log = scrolledtext.ScrolledText(main_frame, width=65, height=12, state='disabled', bg="#333", fg="#eee", font=("Courier New", 9))
        self.output_log.grid(row=row_idx, column=0, columnspan=4, sticky="nsew", pady=(0,5))
        row_idx += 1

        # Configurar expansión de columnas y filas
        main_frame.grid_columnconfigure(1, weight=1)
        main_frame.grid_rowconfigure(2, weight=1) # Row de la listbox
        main_frame.grid_rowconfigure(row_idx - 1, weight=1) # Row del log

        # Redirigir stdout al widget de texto (para mensajes de error del converter, etc.)
        self.original_stdout = sys.stdout
        sys.stdout = TextRedirector(self.output_log, "stdout")

    def _add_input_files(self):
        filetypes = [("Archivos de Imagen", "*.jpg *.jpeg *.png *.bmp *.gif"), ("Todos los Archivos", "*.*")]
        filepaths = filedialog.askopenfilenames(title="Seleccionar archivos de imagen", filetypes=filetypes)
        if filepaths:
            for fp in filepaths:
                if fp not in self.input_files: # Evitar duplicados
                    self.input_files.append(fp)
                    self.input_listbox.insert(tk.END, os.path.basename(fp)) # Mostrar solo el nombre del archivo en la lista
            self._update_listbox_height()

    def _clear_input_list(self):
        self.input_files = []
        self.input_listbox.delete(0, tk.END)
        self._update_listbox_height()

    def _update_listbox_height(self):
        # Ajusta la altura de la listbox dinámicamente hasta un máximo de 8 elementos
        new_height = min(8, len(self.input_files) if len(self.input_files) > 0 else 1)
        self.input_listbox.config(height=new_height)

    def _process_and_export_all(self):
        self._clear_log()
        self.log("Iniciando conversión de imágenes...\n")

        if not self.input_files:
            messagebox.showerror("Error", "Por favor, añade al menos un archivo de imagen a la lista.")
            self.log("❌ Error: No se seleccionaron archivos de entrada.\n")
            return

        total_converted = 0
        for i, input_path in enumerate(self.input_files):
            file_name = os.path.basename(input_path)
            base_name, _ = os.path.splitext(file_name)
            output_dir = os.path.dirname(input_path)
            output_path = os.path.join(output_dir, f"{base_name}.json")

            self.log(f"\n--- Procesando {i+1}/{len(self.input_files)}: {file_name} ---\n")
            self.input_listbox.itemconfig(i, {'bg': '#3A3A3A', 'fg': 'yellow'}) # Resalta el elemento actual

            try:
                converter = ImageToDrawaria(
                    max_colors=self.max_colors.get(),
                    thickness=self.thickness.get(),
                    scale=self.scale.get(), # Se mantiene, pero se ignora si exact_size se usa
                    quality=self.quality.get()
                )
                converter.load_image(input_path)

                exact_w_str = self.exact_size_w.get()
                exact_h_str = self.exact_size_h.get()

                if exact_w_str and exact_h_str:
                    try:
                        exact_w = float(exact_w_str)
                        exact_h = float(exact_h_str)
                        if exact_w <= 0 or exact_h <= 0:
                            raise ValueError("Las dimensiones de tamaño exacto deben ser positivas.")
                        converter.resize_exact(exact_w, exact_h)
                        self.log(f"  Redimensionando a tamaño exacto: {exact_w}x{exact_h}px\n")
                    except ValueError as e:
                        messagebox.showerror("Error de Tamaño Exacto", f"Dimensiones de tamaño exacto inválidas para {file_name}: {e}")
                        self.log(f"  ❌ Error de Tamaño Exacto: {e}\n")
                        self.input_listbox.itemconfig(i, {'bg': '#500000', 'fg': 'white'}) # Rojo para error
                        continue # Pasar a la siguiente imagen

                else:
                    self.log(f"  Escalando la imagen por un factor de: {self.scale.get()}\n")

                self.log("  Procesando imagen y extrayendo contornos...\n")
                converter.process_image()
                self.log("  Exportando comandos JSON...\n")
                converter.export_to_json(output_path)
                self.log(f"  ✅ ¡Completado! {len(converter.commands)} comandos guardados en {output_path}\n")
                self.input_listbox.itemconfig(i, {'bg': '#005000', 'fg': 'white'}) # Verde para éxito
                total_converted += 1

            except Exception as e:
                messagebox.showerror("Error de Conversión", f"Ocurrió un error al convertir {file_name}: {e}")
                self.log(f"  ❌ Error al convertir {file_name}: {e}\n")
                self.input_listbox.itemconfig(i, {'bg': '#500000', 'fg': 'white'}) # Rojo para error
            finally:
                self.log(f"--- Fin de procesamiento de {file_name} ---\n")


        self.log(f"\n¡Proceso de conversión finalizado! {total_converted}/{len(self.input_files)} imágenes convertidas exitosamente.\n")
        messagebox.showinfo("Proceso Completado", f"¡Proceso de conversión finalizado!\n{total_converted}/{len(self.input_files)} imágenes convertidas exitosamente.")


    def log(self, message):
        self.output_log.config(state='normal')
        self.output_log.insert(tk.END, message)
        self.output_log.see(tk.END) # Auto-scroll
        self.output_log.config(state='disabled')

    def _clear_log(self):
        self.output_log.config(state='normal')
        self.output_log.delete(1.0, tk.END)
        self.output_log.config(state='disabled')


# Clase para redirigir la salida de print al widget ScrolledText
class TextRedirector(object):
    def __init__(self, widget, tag="stdout"):
        self.widget = widget
        self.tag = tag

    def write(self, str):
        self.widget.config(state='normal')
        self.widget.insert(tk.END, str, (self.tag,))
        self.widget.see(tk.END)
        self.widget.config(state='disabled')

    def flush(self):
        pass # Necesario para la compatibilidad con sys.stdout

def main():
    root = tk.Tk()
    app = ImageConverterApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
