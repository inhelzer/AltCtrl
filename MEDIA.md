# Media architecture

Google Drive is the archive for original project files and layout instructions.
Published project media lives in https://github.com/inhelzer/AltCtrl-media,
independently of this website repository. Never publish the layout-reference PNGs.

Only the lightweight `assets/altctrl-logo.png` and `assets/campus-logo.png`
live with the website code. All project images, GIFs, MP4s, and video posters
load directly from the media repository. The hero animation lives in `general/`.

The public raw.githubusercontent.com URLs in `app.js` and `index.html` are
pinned to media commit `237c5f692869cfb8eecbb31b39167ba2ba4c362f`.
No token, backend, submodule, or media checkout is required to run the website.

For future media changes, stage only needed assets in temporary storage outside
this repository. Upload them to the corresponding project-ID folder or `general/`
folder in AltCtrl-media, then update the revision in app.js and index.html and
verify the preview before publishing website code. Remove temporary staging
after verifying the remote upload. Do not clone the full media history.

Project text, visibility, order, and tags continue to load from the Projects
Google Sheet. The Media Folder field identifies the source Drive folder (currently by folder label);
it is not a website delivery URL. Individual project compositions in app.js
select the published assets by project ID. Projects 001–013 use real media;
014 embeds the complete Canva presentation. projects.js remains the loading-error fallback.

## Complete page review

Open `http://localhost:8000/?preview=all#projects` to include every named Sheet
row in a local review. This override works only on localhost. The normal site
still requires Published=TRUE. At this snapshot, 001–013 are published and 014
has a blank Published cell; set 014 to TRUE when it should appear in the published view.
ID-only rows without a project name are ignored in both views.

001–013 use individual compositions and real published media. Project 013
intentionally uses one video without a layout reference. Layout PNGs are design
references only and excluded from publication. Supplied graphic titles for
006, 008, 010 and 011 visually replace the Sheet title while retaining it as
the accessible heading.
The Sheet currently leaves the 012 Media Folder cell blank; its verified 012
folder in the main Drive archive supplies that project.
The original 004/driving.mp4 remains in Drive; driving-web.mp4 is a 720p web
export. Video posters keep the page useful without eagerly downloading videos.

## Local preview

The four title PNGs are published in their project folders in AltCtrl-media.
Run `python3 -m http.server 8000` from this repository and open
`http://localhost:8000/?preview=all#projects` for local review.
No project media is stored in this repository.

008 reads alternating student-label/game-URL pairs after Published in the Sheet
(currently O:Z), matching each work to its media. 014 reads the `link 1` and
`embed code` pairs in the same area (currently O:R). Only a validated HTTPS
Canva design `/view?embed` URL becomes an iframe; arbitrary Sheet HTML is never
inserted. The public link is also available below the embedded presentation.
013 currently has only `mediaPipe1.mp4` in its Drive folder and no logo asset;
the simple section is preserved pending the correct supplied graphic.

## Third visual correction release

The supplied `009/unity logo black.png` and `009/unity logo pink.png`
are published in AltCtrl-media and use the pinned release above. The website
requires no temporary preview routes. Use the standard local server described
earlier. Project 013 was rechecked and still has only `mediaPipe1.mp4`;
there is no supplied bottom-logo candidate to select.
