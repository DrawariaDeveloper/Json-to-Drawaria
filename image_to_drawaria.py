import argparse
from pathlib import Path
from core.image_processor import ImageToDrawaria

def main():
    parser = argparse.ArgumentParser(description="Convert any image → Drawaria JSON commands.")
    parser.add_argument("input", help="Input image file (jpg, png, bmp, gif)")
    parser.add_argument("--output", "-o", default="commands.json", help="JSON output path")
    parser.add_argument("--max_colors", type=int, default=8, help="Max colors 1-16 (default 8)")
    parser.add_argument("--thickness", type=int, default=2, help="Stroke thickness 1-50 (default 2)")
    parser.add_argument("--scale", type=float, default=1.0, help="Resize factor 0.1-2.0 (ignored if --exact_size is used)")
    parser.add_argument("--quality", choices=["low", "medium", "high"], default="medium", help="Contour fidelity")
    parser.add_argument("--exact_size", metavar="WxH", help="Force exact output size in px, e.g. 67.3218x67.3218")
    args = parser.parse_args()

    if not Path(args.input).exists():
        raise FileNotFoundError(args.input)

    converter = ImageToDrawaria(
        max_colors=args.max_colors,
        thickness=args.thickness,
        scale=args.scale,
        quality=args.quality
    )
    converter.load_image(args.input)

    if args.exact_size:
        w_str, h_str = args.exact_size.split("x")
        exact_w, exact_h = float(w_str), float(h_str)
        converter.resize_exact(exact_w, exact_h)

    converter.process_image()
    converter.export_to_json(args.output)
    print(f"✅  {len(converter.commands)} commands → {args.output}")

if __name__ == "__main__":
    main()