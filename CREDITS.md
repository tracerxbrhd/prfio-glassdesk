# Credits and licenses

## Design and interaction references

Reviewed during release documentation on 9 September 2026. The shipped screens and components are original; these references informed the material and interaction decisions.

- [MDN: backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) — how translucent surfaces filter their backdrop while leaving foreground content readable, with an opaque fallback for unsupported rendering.
- [Motion: useReducedMotion](https://motion.dev/docs/react-use-reduced-motion) — adapting route motion to the user's system preference.
- [Motion: MotionConfig](https://motion.dev/docs/react-motion-config) — a shared reduced-motion policy for React animation components.

No third-party product screen, proprietary component implementation, or commercial template is distributed with GlassDesk.

## Icons and illustrations

The selected reference is [Customer Service Headset by Freepik on Flaticon](https://www.flaticon.com/free-icon/customer-service-headset_69890), a support-oriented resource whose page requires attribution under the Flaticon license. A licensed SVG resource pack was not acquired for this delivery.

The application uses the requested fallback: **original locally authored SVG paths** in `frontend/src/icons.jsx`, an original chat-mark wordmark, and the local favicon. No Flaticon image or SVG is shipped. The reference does not imply that the original fallback icons are Flaticon assets. If replacing them later, acquire the chosen resources under their applicable license and include the required attribution.

The login illustration, glass material, chart geometry, decorative metric marks, and letter-based avatars are local CSS/SVG compositions. There are no remote profile photographs or stock customer images. Demo people, companies, and messages are fictional and do not imply commercial relationships.

## Typography

The installed `@fontsource-variable/manrope` package supplies the local Manrope font files. Its bundled notice credits **The Manrope Project Authors, 2019** and licenses that font distribution under the **SIL Open Font License 1.1**. The full notice is retained at [docs/licenses/Manrope-OFL.txt](docs/licenses/Manrope-OFL.txt).

- [Fontsource: Manrope](https://fontsource.org/fonts/manrope)
- [Manrope source project](https://github.com/sharanda/manrope)

This attribution applies to the Fontsource distribution actually bundled by the project. It does not claim that every later font release on the author's website has the same license.

## Software

| Dependency | Purpose | License |
| --- | --- | --- |
| React / React DOM | UI rendering | MIT |
| React Router | Workspace navigation | MIT |
| Vite | Local development and production build | MIT |
| Motion | Route transitions and reduced-motion handling | MIT |
| Django | Identity, persistence, and administration | BSD-3-Clause |
| Django REST Framework | API representation, validation, and permissions | BSD-3-Clause |
| django-cors-headers | Explicit cross-origin policy | MIT |
| dj-database-url | Database configuration | BSD-3-Clause |
| Psycopg | PostgreSQL adapter | LGPL-3.0 |
| Gunicorn | WSGI server | MIT |
| WhiteNoise | Django static serving | MIT |
| PostgreSQL | Relational database | PostgreSQL License |
| Nginx | Frontend serving and reverse proxy | BSD-2-Clause |
| Playwright | Browser verification | Apache-2.0 |
| axe-core / axe Playwright integration | Automated accessibility checks | MPL-2.0 |
| ESLint, Prettier, Ruff | Linting and formatting | MIT |

Frontend versions resolve through `frontend/package-lock.json`; backend dependency ranges are declared in `backend/requirements.txt`. Third-party packages retain their own licenses. GlassDesk application source is distributed under the repository [MIT license](LICENSE).
