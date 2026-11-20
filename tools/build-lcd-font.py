#!/usr/bin/env python3
"""Trace LCD glyphs measured from the supplied PLUS test images."""
from pathlib import Path
import struct, math
from io import BytesIO
from zipfile import ZipFile
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[1]
def pack(fmt,*values): return struct.pack('>'+fmt,*values)
def checksum(data):
    data+=b'\0'*((-len(data))%4)
    return sum(struct.unpack('>'+str(len(data)//4)+'I',data))&0xffffffff

def outlines(rows):
    # Union of the observed pixel cells: remove shared edges before tracing.
    # Internal row seams are not separate TrueType contours.
    edges=set()
    for y,row in enumerate(rows):
        for x,value in enumerate(row):
            if value!='1': continue
            points=[(x,11-y),(x,12-y),(x+1,12-y),(x+1,11-y)]
            for start,end in zip(points,points[1:]+points[:1]):
                if (end,start) in edges: edges.remove((end,start))
                else: edges.add((start,end))
    contours=[]
    while edges:
        start,end=min(edges);edges.remove((start,end));points=[start,end]
        while points[-1]!=points[0]:
            previous,current=points[-2:]
            candidates=[b for a,b in edges if a==current]
            if not candidates: raise ValueError('Open glyph contour')
            dx,dy=current[0]-previous[0],current[1]-previous[1]
            def turn(point):
                ux,uy=point[0]-current[0],point[1]-current[1]
                angle=math.atan2(dx*uy-dy*ux,dx*ux+dy*uy)
                return angle if angle < math.pi else -math.pi
            following=min(candidates,key=turn)
            edges.remove((current,following));points.append(following)
        points.pop()
        corners=[]
        for i,point in enumerate(points):
            previous,following=points[i-1],points[(i+1)%len(points)]
            if (point[0]-previous[0])*(following[1]-point[1]) != (point[1]-previous[1])*(following[0]-point[0]): corners.append((point[0]*64,point[1]*64))
        contours.append(corners)
    return contours

def build(data, family="Simulator LCD Numerals"):
    chars=sorted(int(c) for c in data)
    matrices=[[]]+[data[str(c)] for c in chars]
    glyphs=[];loca=[0];metrics=[];max_points=max_contours=0
    for rows in matrices:
        contours=outlines(rows)
        if not contours:
            glyph=b'';left=0
        else:
            pts=[pt for contour in contours for pt in contour]
            left=min(x for x,y in pts)
            glyph=pack('hhhhh',len(contours),left,min(y for x,y in pts),max(x for x,y in pts),max(y for x,y in pts))
            count=0
            for contour in contours:
                count+=len(contour);glyph+=pack('H',count-1)
            glyph+=pack('H',0)+bytes([1])*len(pts)
            for axis in [0,1]:
                previous=0
                for pt in pts:glyph+=pack('h',pt[axis]-previous);previous=pt[axis]
            max_points=max(max_points,len(pts));max_contours=max(max_contours,len(contours))
        # head.flags bit1 requires lsb=xMin; zeroing lsb moved ink into gaps.
        metrics.append(pack('Hh',704,left))
        glyph+=b'\0'*((-len(glyph))%4);glyphs.append(glyph);loca.append(loca[-1]+len(glyph))
    count=len(glyphs)
    head=pack('IIIIHHqqhhhhHHhhh',0x10000,0x10000,0,0x5f0f3cf5,3,1024,0,0,0,-256,704,768,0,8,2,1,0)
    hhea=pack('IhhhH',0x10000,768,-256,0,704)+pack('11hH',0,0,704,1,0,0,0,0,0,0,0,count)
    maxp=pack('IH13H',0x10000,count,max_points,max_contours,0,0,2,0,0,0,0,0,0,0,0)
    segments=chars+[0xffff];n=len(segments);power=2**int(math.log2(n))
    cmap4=pack('7H',4,16+8*n,0,n*2,power*2,int(math.log2(power)),n*2-power*2)
    cmap4+=b''.join(pack('H',x) for x in segments)+pack('H',0)+b''.join(pack('H',x) for x in segments)
    cmap4+=b''.join(pack('H',(i+1-c)&0xffff) for i,c in enumerate(chars))+pack('H',1)+pack('H',0)*n
    names=[];strings=b''
    for ident,text in [(1,family),(2,'Regular'),(4,family+' Regular'),(6,family.replace(' ','')+'-Regular')]:
        raw=text.encode('utf-16-be');names.append(pack('6H',3,1,0x409,ident,len(raw),len(strings)));strings+=raw
    name=pack('3H',0,len(names),6+12*len(names))+b''.join(names)+strings
    os2=bytearray(78)
    struct.pack_into('>HhHHH',os2,0,0,704,400,5,0)
    struct.pack_into('>4sHHHhhhHH',os2,58,b'BXSM',0x40,chars[0],chars[-1],768,-256,0,768,256)
    tables={'head':head,'hhea':hhea,'maxp':maxp,'hmtx':b''.join(metrics),'loca':b''.join(pack('I',v) for v in loca),'glyf':b''.join(glyphs),'cmap':pack('HHHHI',0,1,3,1,12)+cmap4,'name':name,'post':pack('I',0x30000)+b'\0'*28,'OS/2':bytes(os2)}
    tags=sorted(tables);n=len(tags);power=2**int(math.log2(n));font=pack('I4H',0x10000,n,power*16,int(math.log2(power)),n*16-power*16)
    offset=12+16*n;directory=b'';body=b'';head_offset=0
    for tag in tags:
        value=tables[tag];directory+=pack('4sIII',tag.encode(),checksum(value),offset,len(value))
        if tag=='head':head_offset=offset
        padded=value+b'\0'*((-len(value))%4);body+=padded;offset+=len(padded)
    font=bytearray(font+directory+body)
    struct.pack_into('>I',font,head_offset+8,(0xb1b0afba-checksum(font))&0xffffffff)
    return font
def extract():
    fixtures = {
        '0': (6, 70, 59), '1': (7, 114, 59), '2': (7, 147, 59),
        '3': (7, 92, 59), '4': (7, 125, 59), '5': (110, 161, 58),
        '6': (7, 136, 59), '7': (7, 191, 59), '8': (6, 92, 59), '9': (110, 183, 58),
        '.': (7, 103, 59), '−': (112, 72, 13), '+': (114, 86, 13),
        '×': (112, 20, 13), '÷': (112, 135, 13), '(': (112, 85, 13),
        ')': (112, 117, 13)
    }
    doc = next(ROOT.glob('BO TEST*.docx'))
    with ZipFile(doc) as source:
        def read(n):
            return Image.open(BytesIO(source.read(f'word/media/image{n}.png'))).convert('L')

        images = {n: read(n) for n in set(value[0] for value in fixtures.values())}
        glyphs = {}
        for char, (n, x, y) in fixtures.items():
            glyphs[str(ord(char))] = [
                ''.join('1' if images[n].getpixel((x + dx, y + dy)) < 128 else '0' for dx in range(11))
                for dy in range(12)
            ]
        glyphs[str(ord('-'))] = glyphs[str(ord('−'))]
        glyphs['32'] = ['00000000000'] * 12
        out = ROOT / 'web' / 'assets'
        (out / 'lcd-math-880.ttf').write_bytes(build(glyphs, 'LCD Math 880 PLUS'))

        rows = [
            (20, 2, 12, 'Engineer Symbol?'),
            (35, 2, 12, 'FORMAT Key'),
            (39, 24, 28, 'Tiếng Việt'),
            (40, 24, 12, 'English'),
            (46, 2, 12, 'Reset OK?'),
            (46, 2, 28, 'Settings & Data'),
            (47, 2, 28, 'Variable Memory'),
            (48, 2, 28, 'Initialize All'),
            (152, 2, 12, 'Fill Formula'),
            (154, 2, 12, 'Fill Value'),
            (163, 2, 12, 'Auto Calculation?'),
            (185, 2, 12, 'True'),
            (186, 2, 12, 'False'),
            (32, 161, 60, '250'),
            (80, 84, 60, '22.1095602'),
            (142, 73, 60, '0.483941449'),
            (145, 62, 60, '0.6263207792')
        ]
        text_glyphs = {'32': ['00000000000'] * 12}
        for n, x, y, phrase in rows:
            image = read(n)
            for index, char in enumerate(phrase):
                if char == ' ':
                    continue
                pixels = [''.join('1' if image.getpixel((x + index * 11 + dx, y + dy)) < 128
                                  else '0' for dx in range(11)) for dy in range(13)]
                if any('1' in row for row in pixels):
                    text_glyphs.setdefault(str(ord(char)), pixels)
        (out / 'lcd-menu-880.ttf').write_bytes(build(text_glyphs, 'LCD Menu 880 PLUS'))

        # The document contains the native Vietnamese labels for the first HOME page.
        home = read(41)
        for index in range(6):
            column = index % 3
            row = index // 3
            left = [4, 65, 129][column]
            right = [60, 125, 188][column]
            top = [28, 59][row]
            bitmap = home.crop((left, top, right, top + 15))
            opacity = bitmap if index == 0 else ImageOps.invert(bitmap)
            mask = Image.new('RGBA', bitmap.size, 'black')
            mask.putalpha(opacity)
            mask.save(out / 'home' / f'vi-{index + 1}.png')


if __name__ == '__main__':
    extract()
