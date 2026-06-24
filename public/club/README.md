# Tuhaf Club member photos

Drop a square-ish photo here named after the publisher **slug**, then reseed
(`npm run db:reset`) — it will be picked up automatically. Anything missing
falls back to the generated avatar, so the app always renders.

Supported extensions (first match wins): `.jpg`, `.jpeg`, `.png`, `.webp`.

Publisher slugs:

| Slug | Member |
|------|--------|
| `vedat-milor` | Vedat Milor |
| `sinan-canan` | Sinan Canan |
| `zeki-demirkubuz` | Zeki Demirkubuz |
| `refika-birgul` | Refika Birgül |
| `celal-sengor` | Celal Şengör |
| `emrah-safa-gurkan` | Emrah Safa Gürkan |
| `ugur-bati` | Uğur Batı |
| `defne-koryurek` | Defne Koryürek |

Example: `public/club/vedat-milor.jpg`

(These are referenced as `/club/<slug>.<ext>` and served statically by Next.)
