"""Render an original vector-style application icon; no product photograph is edited."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
size=1536
image=Image.new('RGB',(size,size),'#edede9');draw=ImageDraw.Draw(image)
def box(xy,fill,r=0):draw.rounded_rectangle(tuple(round(v*3) for v in xy),radius=r*3,fill=fill)
box((120,48,392,464),'#22272b',38)
box((144,95,368,207),'#cbd8c9',10)
font=ImageFont.truetype(str(ROOT/'web/assets/lcd-numerals.ttf'),78*3)
draw.text((157*3,103*3),'880',font=font,fill='#18231d')
for row in range(5):
 for col in range(4):box((151+col*54,236+row*40,188+col*54,264+row*40),'#818991' if row<2 else '#4c555c',11)
for n in (180,192,512):image.resize((n,n),Image.Resampling.LANCZOS).save(ROOT/f'web/assets/icon-{n}.png')
print('Created180/192/512 application icons from original drawing.')
