"""Download livemarket.pro assets used by the clone and write SVGs/product data.

Usage: python -I scripts/livemarket-assets.py <scratch_dir_with_capture_json>
Inputs (from the CDP capture): live-svgs.json, home-svgs.json, live-data.json
"""
import json, os, re, sys, urllib.request, urllib.parse, hashlib

SCRATCH = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public", "sites", "livemarket")
UA = {"User-Agent": "Mozilla/5.0 (asset-mirror)"}

def get(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())
    return dest

def load(name):
    with open(os.path.join(SCRATCH, name), encoding="utf-8") as f:
        return json.load(f)

def clean_svg(html):
    return re.sub(r'\sdata-sentry-[a-z-]+="[^"]*"', "", html)

# --- fonts (self-hosted by the source) ---
for f in ["PretendardRegular.woff2", "PretendardMedium.woff2", "PretendardSemiBold.woff2",
          "PretendardBold.woff2", "GmarketSansTTFBold.ttf", "GmarketSansTTFMedium.ttf"]:
    get("https://livemarket.pro/fonts/" + f, os.path.join(PUB, "fonts", f))

# --- static images ---
get("https://livemarket.pro/assets/png/live_market_icon.png", os.path.join(PUB, "img", "live_market_icon.png"))
get("https://livemarket.pro/assets/png/brand/yt_icon_red_digital.png", os.path.join(PUB, "img", "yt_icon_red_digital.png"))
# Personal data policy: the seller's avatar is NOT mirrored. The clone uses the fake placeholder
# img/demo-store-avatar.png. Seller name, contacts and SNS handles live as fake values in data/nandapick.ts.

# --- SVGs: name by role ---
home = load("home-svgs.json")["svgs"]
live = load("live-svgs.json")["svgs"]
home_names = ["search", "search-input", "live-logo-filled", "tab-live-active", "tab-store", "tab-plus", "tab-chat", "tab-profile"]
live_names = {0: "plus", 1: "star-four-sm", 2: "star-four-lg", 3: "sparkle", 4: "asterisk", 5: "instagram", 6: "tiktok", 7: "band",
              8: "storefront", 9: "headset", 10: "receipt", 11: "megaphone", 12: "search-input-dark", 13: "long-view", 14: "play"}
for name, s in zip(home_names, home):
    open(os.path.join(PUB, "svg", name + ".svg"), "w", encoding="utf-8").write(clean_svg(s["html"]))
for i, name in live_names.items():
    open(os.path.join(PUB, "svg", name + ".svg"), "w", encoding="utf-8").write(clean_svg(live[i]["html"]))

# --- product snapshot ---
data = load("live-data.json")
products = []
for idx, it in enumerate(data["items"]):
    texts = [t for t in it["texts"] if t != "📌"]
    soon = "곧 품절!" in texts
    texts = [t for t in texts if t not in ("곧 품절!", "+ 주문서 담기")]
    name = texts[0]
    replay = next((t.replace(" 다시보기", "") for t in texts if t.endswith("다시보기")), None)
    price = next((t for t in texts if t.endswith("원")), "")
    stock = next((t for t in texts if t.startswith("재고")), None)
    src = it["img"]
    path = urllib.parse.urlparse(src).path
    ext = os.path.splitext(path)[1].lower() or ".jpg"
    fname = hashlib.sha1(src.encode()).hexdigest()[:12] + ext
    get(src.replace(" ", "%20"), os.path.join(PUB, "products", fname))
    products.append({"id": idx + 1, "name": name, "replay": replay, "price": price, "stock": stock,
                     "soonSoldOut": soon, "pinned": it["pinned"], "image": "/sites/livemarket/products/" + fname,
                     "sourceImage": src})

out = os.path.join(ROOT, "src", "components", "sites", "livemarket", "data")
os.makedirs(out, exist_ok=True)
with open(os.path.join(out, "nandapick-products.json"), "w", encoding="utf-8") as f:
    # The live video ID and title are intentionally not stored; see data/live-video.ts.
    # The captured store notice is not stored either (it names the seller's real bank): the
    # notice shown by the clone is the fake one in data/store-settings.ts.
    json.dump({"capturedAt": "2026-11-20",
               "notice": "가짜 공지입니다. 화면에 표시되는 스토어 공지는 store-settings.ts 에서 관리합니다.",
               "products": products}, f, ensure_ascii=False, indent=2)
print("products", len(products))
