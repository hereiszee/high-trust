/* In-game "Credits & licences" text (title and pause menus read HT.Credits).
   CREDITS is generated from assets/credits/credits.txt, the single source of truth (docs/steam/LICENCES.md): edit that file, then
   run node tools/gen-credits.js. dev/audit/saves/credits-diff.js fails on drift. STUDIO is the developer name. */
(function(){'use strict';
const HT=window.HT=window.HT||{};
const STUDIO='hereiszee';
/* BEGIN generated from assets/credits/credits.txt by tools/gen-credits.js: do not edit by hand */
const CREDITS=`HIGH TRUST

Design, code, procedural art, music and sound
  hereiszee

Built with three.js (r128), © three.js authors, MIT License
Mesh decoding: meshoptimizer, © Arseny Kapoulkine, MIT License

PEOPLE
Characters and motion capture: Microsoft Rocketbox Avatar Library
  © 2020 Microsoft, MIT License (modified: retextured, re-rigged, retargeted)
Additional animation: Quaternius, Universal Animation Library 1 & 2 (CC0)
Family stand-ins and animation: Quaternius, Ultimate Modular Characters,
  Ultimate Animated Animals (CC0)

WORLD
Textures, HDRI sky and props: Poly Haven (CC0)
  Rob Tuytel, Greg Zaal, Jarod Guest, Dimitrios Savva, Rico Cilliers,
  Guillaume Monsergent, Jenelle van Heerden, Charlotte Baglioni,
  Dario Barresi, Sergej Majboroda, Amal Kumar, Josh Dean, GurJas Studios,
  Jorge Camacho, Serhii Khromov, Kirill Sannikov, Ethan Place,
  Aron Łyczek, Benny Weimer, MP, James Ray Cock, Rahul Chaudhary,
  Jurita Burger, Kuutti Siitonen, Amin, Ulan Cabanilla, Gabriel Radić,
  Antanas Kep, Yann Kervran, John Hutcheson, Satyaki Mandal,
  Mateusz Sadek, and the Poly Haven contributors
Textures and decals: ambientCG, Lennart Demes (CC0)
Models: Kenney, Car Kit, Furniture Kit, Mini Arena (CC0)
Models: Quaternius, Stylized Nature MegaKit (CC0)
Models via OpenGameArt (CC0): lucian-pavel (crates and pallet),
  braveo (mailbox), nisu (carbine, from 3dmodelscc0.com)
Furniture icons: Pixel Art Atlas GLB models, CodePawl / Angais (CC0)

TYPE
Barlow and Barlow Condensed by Jeremy Tribby; Bowlby One by Vernon Adams
  SIL Open Font License 1.1

MUSIC
Horn tunes after public-domain compositions by Beethoven, Rossini,
  Joplin, and von Tilzer & Norworth

Full licence texts: THIRD-PARTY-NOTICES.txt beside the game (macOS: inside the app, in Contents).
Thank you to everyone who gives their work away.`;
/* END generated */
/* MIT notices that must ship with the game: one permission text, three copyright lines */
const MIT_BODY=`Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
const NOTICES=[
  ['Microsoft Rocketbox Avatar Library (people models and motion capture)','Copyright (c) 2020 Microsoft'],
  ['three.js','Copyright © 2010-2021 three.js authors'],
  ['meshoptimizer','Copyright (c) Arseny Kapoulkine']];
const FONTS=`Barlow, Barlow Condensed and Bowlby One are licensed under the SIL Open Font License 1.1.
The full font licences ship with the game in assets/fonts (OFL-*.txt).`;
HT.Credits={STUDIO,CREDITS,NOTICES,MIT_BODY,FONTS,
  /* everything as one plain text */
  text(){return CREDITS+'\n\n\nLICENCE NOTICES\n\n'+NOTICES.map(([w,c])=>w+'\nMIT License\n'+c+'\n\n'+MIT_BODY).join('\n\n\n')+'\n\n\n'+FONTS}};
})();
