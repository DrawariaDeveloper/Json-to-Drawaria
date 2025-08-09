import cv2
import numpy as np
from typing import List, Tuple

CANVAS_W, CANVAS_H = 800, 630  # Drawaria reference size

def normalize(x: float, y: float) -> tuple:
    """Convert absolute pixel to 0-1 range."""
    return round(x / CANVAS_W, 4), round(y / CANVAS_H, 4)

def simplify_contour(contour: np.ndarray, epsilon_factor: float = 0.002) -> np.ndarray:
    """Douglas-Peucker simplification."""
    epsilon = epsilon_factor * cv2.arcLength(contour, True)
    return cv2.approxPolyDP(contour, epsilon, True)

def hex_color(bgr: tuple) -> str:
    """BGR to hex string."""
    return "#{:02x}{:02x}{:02x}".format(bgr[2], bgr[1], bgr[0]).upper()