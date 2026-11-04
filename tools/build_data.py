#!/usr/bin/env python3
"""Merge brand JSON files from data/brands/*.json into js/data.js (window.SAE_DATA)."""
import json, glob, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BRANDS = [  # display order and dealer meta (from the original site)
  dict(slug="ksb", color="#2f8fe0", logoDark="images/brands/dark/ksb.svg", files=["ksb"], name="KSB", logo="images/brands/ksb.svg", origin="Germany · Est. 1871", status="Authorized Dealer",
       blurb="German precision engineering with outstanding head and flow for Indian farms and municipalities."),
  dict(slug="kirloskar", color="#e4002b", logoDark="images/brands/dark/kirloskar.webp", files=["kirloskar"], name="Kirloskar", logo="images/brands/kirloskar-t.webp", origin="India · Pune, Est. 1888", status="Authorized Dealer",
       blurb="India's most trusted pump brand. Rugged, energy-efficient SPB-range submersibles."),
  dict(slug="wilo", color="#00a88f", logoDark="images/brands/dark/wilo.svg", files=["wilo"], name="Wilo", logo="images/brands/wilo.svg", origin="Germany · Est. 1872", status="Authorized Dealer",
       blurb="Smart, premium pumping technology that cuts power bills and keeps pressure steady."),
  dict(slug="ekki-deccan", color="#e30613", logoDark="images/brands/dark/ekki-deccan.webp", files=["ekki", "deccan"], name="Ekki-Deccan", logo="images/brands/ekki-deccan.webp", origin="India · Coimbatore, Est. 1981", status="Certified ADBS Dealer",
       blurb="South India's largest submersible makers. EKKI borewells and DECCAN openwells for high-head farm pumping."),
  dict(slug="cri", color="#e2231a", logoDark="images/brands/dark/cri.webp", files=["cri"], name="C.R.I.", logo="images/brands/cri.png", origin="India · Coimbatore, Est. 1961", status="Dealer",
       blurb="Commitment, Reliability, Innovation. Borewell, openwell and solar submersibles."),
  dict(slug="falcon", color="#ef3b2c", logoDark="images/brands/dark/falcon.webp", files=["falcon"], name="Falcon", logo="images/brands/falcon.webp", origin="India · Rajkot, Est. 1994", status="Dealer",
       blurb="A Machine For Mankind. Robust borewell pumpsets loved in hard-rock farmland."),
  dict(slug="lubi", color="#1f7ae0", logoDark="images/brands/dark/lubi.webp", files=["lubi"], name="Lubi", logo="images/brands/lubi.webp", origin="India · Ahmedabad, Est. 1965", status="Dealer",
       blurb="Compact, efficient pumps and motors for homes and farm irrigation."),
  dict(slug="crompton", color="#3b82f6", logoDark="images/brands/dark/crompton.webp", files=["crompton"], name="Crompton", logo="images/brands/crompton.webp", origin="India · Est. 1937", status="Dealer",
       blurb="Smart, reliable pumping from a household Indian name, with service reach in every district."),
]

def flat(v, pre=""):
    """Turn nested dict/list values into readable strings."""
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            key = (pre + " · " if pre else "") + str(k).replace("_", " ")
            if isinstance(x, dict): out.update(flat(x, key))
            elif isinstance(x, list): out[key] = "; ".join(json.dumps(i, ensure_ascii=False) if isinstance(i, dict) else str(i) for i in x)
            else: out[key] = str(x)
        return out
    return v

def limits_str(v):
    if isinstance(v, dict):
        return "; ".join(f"{k[:1].upper()+k[1:]}: {x}" for k, x in flat(v).items() if x)
    if isinstance(v, list): return "; ".join(str(i) for i in v)
    return v or ""

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
            if img:  # prefer the cut-out (transparent) version made by tools/cutout.py
                cut = os.path.splitext(img)[0] + ".cut.webp"
                if os.path.exists(os.path.join(ROOT, cut)): img = cut
            pf, pt = num(p.get("price_from")), num(p.get("price_to"))
            products.append(dict(
                id=f"{b['slug']}-{len(products)}", brand=b["slug"], brandName=b["name"], subBrand=sub,
                name=p.get("name",""), series=p.get("series",""), category=p.get("category","Agriculture"),
                type=p.get("type",""), power=p.get("power_range",""), head=p.get("head_range",""),
                flow=p.get("flow_range",""), bore=p.get("borewell_size",""), phase=p.get("phase",""),
                highlights=p.get("highlights",[]), applications=p.get("applications",[]),
                priceFrom=p.get("price_from","") if pf else "", priceTo=p.get("price_to","") if pt else "",
                pf=pf, pt=pt, img=img, src=p.get("source_url",""),
                desc=p.get("description",""), models=p.get("models",[]), features=p.get("features",[]),
                materials=flat(p.get("materials",{}) or {}), motor=limits_str(p.get("motor","")), warranty=p.get("warranty",""),
                limits=limits_str(p.get("operating_limits","")), sheet=(p.get("datasheet_url","") or "").replace(" ","%20"), sources=p.get("sources",[])))
            meta["count"] += 1
    out_brands.append(meta)

out_brands.append(dict(slug="aqua-tide", name="Aqua Tide", logo="images/logo-aqua-tide.webp", logoDark="images/logo-aqua-tide.webp", color="#3ee0ff", origin="Sri Anjaneya Enterprises · Own brand",
    status="Registered Own Brand", blurb="Our self-developed submersible motor brand, built for Indian water conditions.", own=True, count=0, websites=[]))

js = "window.SAE_DATA=" + json.dumps(dict(brands=out_brands, products=products), ensure_ascii=False, separators=(",", ":")) + ";\n"
open(os.path.join(ROOT, "js", "data.js"), "w", encoding="utf-8").write(js)
print(len(products), "products;", {b["slug"]: b["count"] for b in out_brands})
