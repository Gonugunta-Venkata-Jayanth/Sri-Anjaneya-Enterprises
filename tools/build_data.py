#!/usr/bin/env python3
"""Merge brand JSON files from data/brands/*.json into js/data.js (window.SAE_DATA)."""
import json, glob, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BRANDS = [  # display order and dealer meta (from the original site)
  dict(slug="ksb", files=["ksb"], name="KSB", logo="images/brands/ksb.svg", origin="Germany · Est. 1871", status="Authorized Dealer",
       blurb="German precision engineering with outstanding head and flow for Indian farms and municipalities."),
  dict(slug="kirloskar", files=["kirloskar"], name="Kirloskar", logo="images/brands/kirloskar.webp", origin="India · Pune, Est. 1888", status="Authorized Dealer",
       blurb="India's most trusted pump brand. Rugged, energy-efficient SPB-range submersibles."),
  dict(slug="wilo", files=["wilo"], name="Wilo", logo="images/brands/wilo.svg", origin="Germany · Est. 1872", status="Authorized Dealer",
       blurb="Smart, premium pumping technology that cuts power bills and keeps pressure steady."),
  dict(slug="ekki-deccan", files=["ekki", "deccan"], name="Ekki-Deccan", logo="images/brands/ekki-deccan.webp", origin="India · Coimbatore, Est. 1981", status="Certified ADBS Dealer",
       blurb="South India's largest submersible makers. EKKI borewells and DECCAN openwells for high-head farm pumping."),
  dict(slug="cri", files=["cri"], name="C.R.I.", logo="images/brands/cri.png", origin="India · Coimbatore, Est. 1961", status="Dealer",
       blurb="Commitment, Reliability, Innovation. Borewell, openwell and solar submersibles."),
  dict(slug="falcon", files=["falcon"], name="Falcon", logo="images/brands/falcon.webp", origin="India · Rajkot, Est. 1994", status="Dealer",
       blurb="A Machine For Mankind. Robust borewell pumpsets loved in hard-rock farmland."),
  dict(slug="lubi", files=["lubi"], name="Lubi", logo="images/brands/lubi.webp", origin="India · Ahmedabad, Est. 1965", status="Dealer",
       blurb="Compact, efficient pumps and motors for homes and farm irrigation."),
  dict(slug="crompton", files=["crompton"], name="Crompton", logo="images/brands/crompton.webp", origin="India · Est. 1937", status="Dealer",
       blurb="Smart, reliable pumping from a household Indian name, with service reach in every district."),
]

def num(p):
    m = re.sub(r"[^\d.]", "", p or "")
    try: return float(m) if m else None
    except ValueError: return None

out_brands, products = [], []
for b in BRANDS:
    meta = dict(b); files = meta.pop("files"); meta["websites"] = []; meta["count"] = 0
    for f in files:
        path = os.path.join(ROOT, "data", "brands", f + ".json")
        if not os.path.exists(path):
            continue
        d = json.load(open(path, encoding="utf-8"))
        if d.get("website"): meta["websites"].append(d["website"])
        if d.get("tagline"): meta.setdefault("tagline", d["tagline"])
        sub = d.get("brand", b["name"])
        for p in d.get("products", []):
            img = p.get("image_file") or ""
            if img and not os.path.exists(os.path.join(ROOT, img)): img = ""
            pf, pt = num(p.get("price_from")), num(p.get("price_to"))
            products.append(dict(
                id=f"{b['slug']}-{len(products)}", brand=b["slug"], brandName=b["name"], subBrand=sub,
                name=p.get("name",""), series=p.get("series",""), category=p.get("category","Agriculture"),
                type=p.get("type",""), power=p.get("power_range",""), head=p.get("head_range",""),
                flow=p.get("flow_range",""), bore=p.get("borewell_size",""), phase=p.get("phase",""),
                highlights=p.get("highlights",[]), applications=p.get("applications",[]),
                priceFrom=p.get("price_from","") if pf else "", priceTo=p.get("price_to","") if pt else "",
                pf=pf, pt=pt, img=img, src=p.get("source_url","")))
            meta["count"] += 1
    out_brands.append(meta)

out_brands.append(dict(slug="aqua-tide", name="Aqua Tide", logo="images/logo-aqua-tide.webp", origin="Sri Anjaneya Enterprises · Own brand",
    status="Registered Own Brand", blurb="Our self-developed submersible motor brand, built for Indian water conditions.", own=True, count=0, websites=[]))

js = "window.SAE_DATA=" + json.dumps(dict(brands=out_brands, products=products), ensure_ascii=False, separators=(",", ":")) + ";\n"
open(os.path.join(ROOT, "js", "data.js"), "w", encoding="utf-8").write(js)
print(len(products), "products;", {b["slug"]: b["count"] for b in out_brands})
