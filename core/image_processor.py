import cv2
import numpy as np
from sklearn.cluster import KMeans
from PIL import Image
from typing import List, Dict, Tuple
from .utils import normalize, simplify_contour, hex_color

class ImageToDrawaria:
    """
    Converts an image → Drawaria WebSocket commands (JSON-ready).
    """

    def __init__(self,
                 max_colors: int = 8,
                 thickness: int = 2,
                 scale: float = 1.0,
                 quality: str = "medium"):
        self.max_colors = max(1, min(16, max_colors))
        self.thickness = clamp(thickness, 1, 50)
        self.scale = clamp(scale, 0.1, 2.0)
        self.quality = quality
        self.image = None
        self.commands: List[List] = []

    # ---------- Public API ----------
    def load_image(self, file_path: str) -> None:
        img = Image.open(file_path).convert("RGB")
        w, h = img.size
        new_size = (int(w * self.scale), int(h * self.scale))
        img = img.resize(new_size, Image.LANCZOS)
        self.image = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    def resize_exact(self, w: float, h: float):
        """Resize to exact pixel dimensions."""
        self.image = cv2.resize(self.image, (int(round(w)), int(round(h))),
                                interpolation=cv2.INTER_NEAREST)

    def process_image(self) -> None:
        self._reduce_colors()
        self._extract_paths()

    def generate_draw_commands(self) -> List[List]:
        return self.commands

    def export_to_json(self, out_path: str) -> None:
        import json, os
        meta = {
            "original_image": os.path.basename(out_path),
            "canvas_width": 800,
            "canvas_height": 630,
            "total_commands": len(self.commands),
            "estimated_draw_time": f"{round(len(self.commands) * 0.02)}s"
        }
        payload = {"metadata": meta, "commands": self.commands}
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, separators=(",", ":"))

    # ---------- Internal helpers ----------
    def _reduce_colors(self):
        Z = self.image.reshape((-1, 3))
        k = min(self.max_colors, len(np.unique(Z, axis=0)))
        kmeans = KMeans(n_clusters=k, random_state=42, n_init="auto").fit(Z)
        self.palette = kmeans.cluster_centers_.astype(np.uint8)
        self.labels = kmeans.labels_

    def _extract_paths(self):
        for idx, color in enumerate(self.palette):
            mask = (self.labels == idx).reshape(self.image.shape[:2])
            color_bgr = tuple(map(int, color))
            self._trace_mask_to_commands(mask, hex_color(color_bgr))

    def _trace_mask_to_commands(self, mask: np.ndarray, color: str):
        contours, _ = cv2.findContours(mask.astype(np.uint8),
                                       cv2.RETR_EXTERNAL,
                                       cv2.CHAIN_APPROX_NONE)
        for cnt in contours:
            cnt = simplify_contour(cnt)
            for i in range(len(cnt) - 1):
                x1, y1 = cnt[i][0]
                x2, y2 = cnt[i + 1][0]
                nx1, ny1 = normalize(x1, y1)
                nx2, ny2 = normalize(x2, y2)
                self.commands.append(
                    ["drawcmd", 0,
                     [nx1, ny1, nx2, ny2, False, -self.thickness, color, 0, 0, {}]]
                )

def clamp(value, mn, mx):
    return max(mn, min(mx, value))