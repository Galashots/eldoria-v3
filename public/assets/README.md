# Assets

Drop your sprite PNGs, `tileset.png`, and `music-town.mp3` here. Everything in
`public/` is served at the site root, so a file here at `public/assets/foo.png`
loads as `assets/foo.png` in Phaser.

## Migrating from the old repo
Copy the originals straight over — they're framework-agnostic:
```
cp ../eldoria/assets/*.png  public/assets/
cp ../eldoria/assets/*.mp3  public/assets/
```
Then bring the sprite pipeline tools too (they still work unchanged):
```
cp ../eldoria/tools/*.mjs ../eldoria/tools/SPRITE_PIPELINE.md tools/
```
