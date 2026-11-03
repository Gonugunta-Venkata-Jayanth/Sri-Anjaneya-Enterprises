# Sri Anjaneya Enterprises · Website v2

Authorised dealer of submersible pumps and motors, Old Boiguda, Secunderabad (GST 36ASFPG1225Q1ZM).

**Live:** https://gonugunta-venkata-jayanth.github.io/Sri-Anjaneya-Enterprises/

## What's inside
- **3D hero** (Three.js): a procedural submersible pump you can drag to spin, rising bubbles and light rays. Falls back to a lightweight animated hero on low-power devices.
- **Catalogue of 177 submersible series** from KSB, Kirloskar, Wilo, Ekki-Deccan, C.R.I., Falcon, Lubi and Crompton: search, Agriculture/Domestic filter, brand and type filters, sort by price, grid/list view.
- **Price bands** shown as *Starts from / Up to* (indicative; final price on quotation).
- **Compare** up to 4 pumps, **enquiry basket** that sends to WhatsApp or email.
- **Pump finder**: estimates head, flow and HP from well depth, water level and daily need.
- Brand pages with official logos, certificates, shop gallery (3D coverflow), reviews (saved on the visitor's device), map and navigation links.
- **Aqua Tide** (own brand) shows an "under construction" note.
- GSAP scroll animations, Lenis smooth scroll, video bands, glassmorphism, magnetic buttons, custom cursor.

## Updating products
Edit `data/brands/<brand>.json`, then run:
```bash
python tools/build_data.py   # regenerates js/data.js
```
CI validates the JSON, checks every image exists, lints the HTML and deploys to GitHub Pages on each push to `main`.

The previous single-page site is kept at `/legacy/`.

## Credits
Brand names, logos and product data belong to their owners and are shown for dealer reference. Background clips from Mixkit (free licence).
