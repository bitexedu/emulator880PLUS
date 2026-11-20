"""Convert the four supplied product photos to transparent sRGB WebP assets."""
from io import BytesIO
from pathlib import Path
import struct

from PIL import Image, ImageCms, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CROP = (1136, 596, 3160, 4832)
COLORS = {'AR': 'black', 'CR': 'pink', 'ER': 'white', 'GR': 'green'}


def photoshop_path(resources):
    cursor = 0
    while cursor + 12 <= len(resources):
        signature, resource_id = struct.unpack_from('>4sH', resources, cursor)
        if signature != b'8BIM':
            raise ValueError('Unexpected Photoshop image resource')
        cursor += 6
        cursor += (resources[cursor] + 2) & ~1
        size = struct.unpack_from('>I', resources, cursor)[0]
        cursor += 4
        if resource_id == 2000:
            return resources[cursor:cursor + size]
        cursor += (size + 1) & ~1
    raise ValueError('Missing outline path in TIFF')


def silhouette(image):
    path = photoshop_path(image.tag_v2[34377])
    knots = []
    for position in range(0, len(path), 26):
        selector, *coordinates = struct.unpack_from('>H6i', path, position)
        if selector not in {1, 2}:
            continue
        pairs = zip(coordinates[::2], coordinates[1::2])
        knots.append([(x / 2**24 * image.width - CROP[0], y / 2**24 * image.height - CROP[1])
                      for y, x in pairs])
    if not knots:
        raise ValueError('Empty outline path in TIFF')

    points = []
    for previous, following in zip(knots, knots[1:] + knots[:1]):
        controls = previous[1], previous[2], following[0], following[1]
        for index in range(48):
            t = index / 48
            u = 1 - t
            weights = u**3, 3 * u**2 * t, 3 * u * t**2, t**3
            points.append(tuple(sum(point[axis] * weight for point, weight in zip(controls, weights))
                                for axis in range(2)))
    alpha = Image.new('L', (CROP[2] - CROP[0], CROP[3] - CROP[1]), 0)
    ImageDraw.Draw(alpha).polygon(points, fill=255)
    return alpha


def build():
    for code, color in COLORS.items():
        source = ROOT / f'fx-880BTG_PLUS_F_FY-523{code}.tif'
        with Image.open(source) as tiff:
            alpha = silhouette(tiff)
            embedded = ImageCms.ImageCmsProfile(BytesIO(tiff.info['icc_profile']))
            rgb = ImageCms.profileToProfile(tiff.crop(CROP), embedded, ImageCms.createProfile('sRGB'))
            rgb.putalpha(alpha)
            face = rgb.resize((1012, 2118), Image.Resampling.LANCZOS)
            face.save(ROOT / 'web' / 'assets' / f'face-{color}.webp', quality=94, method=6, exact=True)


if __name__ == '__main__':
    build()
