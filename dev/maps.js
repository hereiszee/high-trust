/* Mission tile maps copied from index.html MISSIONS (legend: # wall, h house, c crate, t tree, T table, f hedge, V van, Q grill, X crew van, E enemy, B boss, S wave spawn, I packages, a ammo, P player start). Regenerate with: node dev/ai.test.js --sync-maps */
(function(r){const MAPS=[
 {
  "id": "gary",
  "title": "Return to Sender",
  "type": "loot",
  "pad": ",",
  "crew": [
   "gary"
  ],
  "weapons": [
   "pistol",
   "shotgun"
  ],
  "map": [
   ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
   ",,X,,,,,,,,,,,,,,,,,,,,,,,,,,,",
   ",,,,P,,,,,,,,,c,,,,,,,,,,E,,,,",
   ",,,,,,,,,,,,,,,,,,,,c,,,,,,,,,",
   ",,,,,,,,,c,,,,,,E,,,,,,,,,,,,,",
   "##############..##############",
   "#.......c....#..#.....I......#",
   "#..E....c....#..#....cc..E...#",
   "#............#..#............#",
   "#...cc...E..........E........#",
   "#...cc.......#..#......cc....#",
   "#.I..........#..#......cc.a..#",
   "######..######..######..######",
   "#.......#..............#.....#",
   "#...E...#...c....c.....#..I..#",
   "#.......#...c....c..E..#.....#",
   "#..a.........................#",
   "#....I..#.....E........#..E..#",
   "#.......#..............#.....#",
   "##############################"
  ]
 },
 {
  "id": "rick",
  "title": "Fourth Quarter",
  "type": "stash",
  "pad": "t",
  "crew": [
   "gary",
   "rick"
  ],
  "weapons": [
   "pistol",
   "shotgun",
   "rifle"
  ],
  "time": 150,
  "map": [
   "tttttttttttttttttttttttttttt",
   "t,,,,,,,,,,,,,,,,,,,,,,,,,,t",
   "t,,X,,P,,,,,,,,,,,,,,,,,,,,t",
   "t,,,,,,,,,,,,f,,,,,,,,f,,,,t",
   "t,,,,ffff,,,,f,,E,,,,,f,,,,t",
   "t,,,,,,,,,,,,,,,,,,,,,,,,,,t",
   "t########.####.#########.#,t",
   "t#.....#....#.....#......#,t",
   "t#..T..#.E..#..E..#..T...#,t",
   "t#.....#....#.....#......#,t",
   "t#..E.......c...........E#,t",
   "t###.#####.####.#####.####,t",
   "t#.....#.........#.......#,t",
   "t#..E..#..cc..E..#...E...#,t",
   "t#.....#.........#.......#,t",
   "t#..a.......T........a...#,t",
   "t#.....#.........#.......#,t",
   "t#########################,t",
   "t,,,,,,,,,,,,,,,,,,,,,,,,,,t",
   "tttttttttttttttttttttttttttt"
  ]
 },
 {
  "id": "dave",
  "title": "Block Party",
  "type": "waves",
  "pad": "t",
  "crew": [
   "gary",
   "rick",
   "dave"
  ],
  "weapons": [
   "pistol",
   "shotgun",
   "rifle"
  ],
  "waves": [
   5,
   7,
   10
  ],
  "map": [
   "tttttttttttttttttttttttttttttt",
   "tggggggggggggSgggggggggggggggt",
   "tggggtggggggggggggggggtggggggt",
   "tggggggggggggggggggggggggggggt",
   "tSggggggcggggggggggggcggggggSt",
   "tggggggggggggggggggggggggggggt",
   "tggtgggggggccgQgccgggggggtgggt",
   "tgggggggggggggPggggggggggggggt",
   "tggggggggcggggggggggcggggggggt",
   "tggggggggggggggggggggggggggggt",
   "tSggggggggggtgggggtgggggggggSt",
   "tggggggggggggggggggggggggggggt",
   "tggggggggggggSgggggggggggggggt",
   "tttttttttttttttttttttttttttttt"
  ]
 },
 {
  "id": "doug",
  "title": "The Kingpin",
  "type": "boss",
  "pad": "t",
  "crew": [
   "gary",
   "rick",
   "dave",
   "doug"
  ],
  "weapons": [
   "pistol",
   "shotgun",
   "rifle"
  ],
  "map": [
   "ttttttttttttttttttttttttttttt",
   "t,,,,,,,,,,,,,,,,,,,,,,,,,,,t",
   "t,,X,P,,,,,,,,,,,,,,,,,,,,,,t",
   "t,,,,,,,,,,,,,,,,,,,,,,,,,,,t",
   "tfffffffffff,,,,,ffffffffffft",
   "tgggggggggggggggggggggggggggt",
   "tggEgggcgggggggggggggcgggEggt",
   "tggggggggggEgggggEggggggggggt",
   "tggggcggggggggggggggggggcgggt",
   "tgg##########.#####.#######gt",
   "tgg#........#.....#.......#gt",
   "tgg#..E..cc.......#.cc..E.#gt",
   "tgg#........#.....#.......#gt",
   "tgg####.#######.#####.#####gt",
   "tgg#.......#.........#....#gt",
   "tgg#..E....#...E.....#..a.#gt",
   "tgg#.......#.........#....#gt",
   "tgg#..........cc.......E..#gt",
   "tgg#####.########.#########gt",
   "tgg#.......#........#.....#gt",
   "tgg#..a....#...B....#..E..#gt",
   "tgg#.......#..E..E..#.....#gt",
   "tgg#......................#gt",
   "tgg########################gt",
   "ttttttttttttttttttttttttttttt"
  ]
 }
];if(typeof module!=="undefined")module.exports=MAPS;else (r.HT=r.HT||{}).MAPS=MAPS})(typeof window!=="undefined"?window:globalThis);
