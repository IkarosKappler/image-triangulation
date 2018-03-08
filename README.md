A simple image and point set triangulation using Delaunay 
=========================================================

Written in Javascript (with HTML5 Canvas), inspired by the delaunay triangulation algorithm found at
http://www.travellermap.com/tmp/delaunay.htm

Feature list
 * Random point set.
 * Triangulate point set.
 * Use triangulation colors from image.
 * Export SVG images.
 * Export vertex list (JSON file).
 * Import vertext list (JSON file).


![A simple triangulation with 25 points](triangulation-a.png)


![A simple triangulation of an icon](triangulation_2.svg)


![A simple triangulation of a photo](IMG_20170901_232450_800x600_triangulation.svg)

It is also safe to add vertices outside the bounding box (when load via JSON).
![Bounds safe color picker](screenshot-safe-border-20180308.png)


 Live demo at http://int2byte.de/public/image-triangulation/main.html
 