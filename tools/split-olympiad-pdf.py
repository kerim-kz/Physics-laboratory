# Олимпиада PDF-ін тапсырмаларға бөліп, әрқайсысын жеке PNG етіп сақтайды (мәтін + сурет + нұсқалар).
# Қолданылуы: python3 tools/split-olympiad-pdf.py <тапсырмалар.pdf> public/img/olympiad/<кілт> <атау>
# Шығатыны: qNN.png суреттері және questions.json (src/data/olympiad-tests.js-ке көшіріледі; жауаптар кілтін қолмен қосыңыз).
# Қажет: pdftoppm (poppler-utils), Python пакеттері pdfplumber және Pillow.
import json, os, re, subprocess, sys, tempfile
import pdfplumber
from PIL import Image

DPI = 150
S = DPI / 72.0

def is_ink_row(img, y, x0, x1):
    px = img.load()
    for x in range(x0, x1, 2):
        if px[x, y] < 225:
            return True
    return False

def white_row_above(img, y, x0, x1, limit=0):
    y = int(y)
    while y > limit and is_ink_row(img, y, x0, x1):
        y -= 1
    return y

def content_rows(img, x0, x1):
    top = 0
    while top < img.height and not is_ink_row(img, top, x0, x1): top += 1
    bot = img.height - 1
    while bot > 0 and not is_ink_row(img, bot, x0, x1): bot -= 1
    return top, bot

def trim(im, pad=14):
    g = im.convert('L').point(lambda v: 255 if v > 235 else 0)
    inv = Image.eval(g, lambda v: 255 - v)
    bbox = inv.getbbox()
    if not bbox: return im
    l, t, r, b = bbox
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))

def main(pdf_path, out_dir, prefix):
    os.makedirs(out_dir, exist_ok=True)
    tmp = os.path.join(tempfile.mkdtemp(), prefix)
    subprocess.run(['pdftoppm', '-r', str(DPI), '-png', pdf_path, tmp], check=True)
    pdf = pdfplumber.open(pdf_path)
    n_pages = len(pdf.pages)
    pages = []
    for i in range(n_pages):
        cand = [f'{tmp}-{i+1}.png', f'{tmp}-{i+1:02d}.png']
        path = next(c for c in cand if os.path.exists(c))
        pages.append(Image.open(path).convert('RGB'))
    gray = [p.convert('L') for p in pages]
    W = pages[0].width
    x0, x1 = int(40 * S), W - int(40 * S)
    # Шекаралар: тапсырма басы және бөлім тақырыптары
    marks = []  # (page, y_px, kind, num, text)
    texts = {}
    expect = 1
    for pi, page in enumerate(pdf.pages):
        for l in page.extract_text_lines():
            t = l['text'].strip()
            m = re.match(r'^(\d{1,2})\s*\.', t)
            if m and int(m.group(1)) == expect:
                marks.append((pi, l['top'] * S, 'q', expect)); expect += 1
            elif 'ұпайлық' in t.lower():
                marks.append((pi, l['top'] * S, 'h', None))
    assert expect == 31, f'found {expect-1} questions'
    # Әр тапсырманың мәтіні (alt үшін)
    allwords = []
    for pi, page in enumerate(pdf.pages):
        for l in page.extract_text_lines():
            allwords.append((pi, l['top'] * S, l['text'].strip()))
    # Белгілерді ақ жолға дейін жылжыту
    bounds = []
    for (pi, y, kind, num) in marks:
        yb = white_row_above(gray[pi], y - 2, x0, x1)
        bounds.append((pi, yb, kind, num))
    end_doc_page = n_pages - 1
    _, end_doc_y = content_rows(gray[end_doc_page], x0, x1)
    result = []
    for idx, (pi, yb, kind, num) in enumerate(bounds):
        if kind != 'q': continue
        if idx + 1 < len(bounds):
            pe, ye = bounds[idx + 1][0], bounds[idx + 1][1]
        else:
            pe, ye = end_doc_page, end_doc_y + 4
        pieces = []
        for p in range(pi, pe + 1):
            top_c, bot_c = content_rows(gray[p], x0, x1)
            ys = yb if p == pi else top_c
            ye_p = ye if p == pe else bot_c + 4
            if ye_p - ys > 6:
                pieces.append(pages[p].crop((0, int(ys), W, int(ye_p))))
        h = sum(pc.height for pc in pieces) + 8 * (len(pieces) - 1)
        im = Image.new('RGB', (W, h), 'white')
        y = 0
        for pc in pieces:
            im.paste(pc, (0, y)); y += pc.height + 8
        im = trim(im)
        q = im.convert('P', palette=Image.ADAPTIVE, colors=48)
        fn = f'q{num:02d}.png'
        q.save(os.path.join(out_dir, fn), optimize=True)
        # alt мәтін
        words = [t for (p, yy, t) in allwords if (p > pi or (p == pi and yy >= yb)) and (p < pe or (p == pe and yy < ye))]
        alt = ' '.join(words)
        alt = re.sub(r'\s+', ' ', alt).strip()
        result.append({'n': num, 'img': fn, 'w': q.width, 'h': q.height, 'alt': alt[:400]})
    json.dump(result, open(os.path.join(out_dir, 'questions.json'), 'w'), ensure_ascii=False, indent=1)
    print(prefix, len(result), 'questions; sizes', sum(os.path.getsize(os.path.join(out_dir, r['img'])) for r in result) // 1024, 'KB')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
