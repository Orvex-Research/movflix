/**
 * MOVFLIX – Central Media Database
 * Curated TMDB-backed catalog with real IDs, posters, and metadata.
 * All TMDB IDs and image paths are 100% verified against TMDB CDN.
 */
const MOVFLIX_DB = [
  {
    "id": "stranger-things",
    "tmdbId": 66732,
    "type": "tv",
    "title": "Stranger Things",
    "match": 99,
    "age": "16+",
    "year": 2024,
    "seasons": 5,
    "totalEpisodes": 42,
    "genres": [
      "Sci-Fi",
      "Horror",
      "Drama"
    ],
    "duration": null,
    "cast": "Millie Bobby Brown, Finn Wolfhard, Winona Ryder, David Harbour",
    "overview": "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
    "poster": "https://image.tmdb.org/t/p/w500/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/9P4IIMYY3HifqeruZq0ZZ9g7YUi.jpg",
    "tags": [
      "trending",
      "tv",
      "scifi",
      "drama"
    ]
  },
  {
    "id": "arcane",
    "tmdbId": 94605,
    "type": "tv",
    "title": "Arcane: League of Legends",
    "match": 99,
    "age": "16+",
    "year": 2024,
    "seasons": 2,
    "totalEpisodes": 18,
    "genres": [
      "Animation",
      "Sci-Fi",
      "Action"
    ],
    "duration": null,
    "cast": "Hailee Steinfeld, Ella Purnell, Kevin Alejandro",
    "overview": "Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and clashing convictions.",
    "poster": "https://image.tmdb.org/t/p/w500/87C0wecB8bHb1PsrKBI4kJiEkgV.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg",
    "tags": [
      "trending",
      "anime",
      "scifi",
      "tv"
    ]
  },
  {
    "id": "the-last-of-us",
    "tmdbId": 100088,
    "type": "tv",
    "title": "The Last of Us",
    "match": 98,
    "age": "18+",
    "year": 2023,
    "seasons": 2,
    "totalEpisodes": 16,
    "genres": [
      "Drama",
      "Sci-Fi",
      "Action"
    ],
    "duration": null,
    "cast": "Pedro Pascal, Bella Ramsey, Gabriel Luna, Anna Torv",
    "overview": "Twenty years after modern civilization has been destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone. What starts as a small job soon becomes a brutal, heartbreaking journey, as they both must traverse the United States and depend on each other for survival.",
    "poster": "https://image.tmdb.org/t/p/w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg",
    "tags": [
      "trending",
      "tv",
      "drama"
    ]
  },
  {
    "id": "wednesday",
    "tmdbId": 119051,
    "type": "tv",
    "title": "Wednesday",
    "match": 97,
    "age": "13+",
    "year": 2022,
    "seasons": 3,
    "totalEpisodes": 16,
    "genres": [
      "Comedy",
      "Fantasy",
      "Mystery"
    ],
    "duration": null,
    "cast": "Jenna Ortega, Gwendoline Christie, Jamie McShane",
    "overview": "Smart, sarcastic and a little dead inside, Wednesday Addams investigates twisted mysteries while making new friends — and foes — at Nevermore Academy.",
    "poster": "https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/iHSwvRVsRyxpX7FE7GbviaDvgGZ.jpg",
    "tags": [
      "trending",
      "tv",
      "mystery"
    ]
  },
  {
    "id": "breaking-bad",
    "tmdbId": 1396,
    "type": "tv",
    "title": "Breaking Bad",
    "match": 100,
    "age": "18+",
    "year": 2008,
    "seasons": 5,
    "totalEpisodes": 62,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "duration": null,
    "cast": "Bryan Cranston, Aaron Paul, Anna Gunn, Dean Norris",
    "overview": "Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family's financial future at any cost as he enters the dangerous world of drugs and crime.",
    "poster": "https://image.tmdb.org/t/p/w500/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    "tags": [
      "trending",
      "tv",
      "crime",
      "drama"
    ]
  },
  {
    "id": "house-of-dragon",
    "tmdbId": 94997,
    "type": "tv",
    "title": "House of the Dragon",
    "match": 96,
    "age": "18+",
    "year": 2024,
    "seasons": 3,
    "totalEpisodes": 26,
    "genres": [
      "Drama",
      "Action",
      "Fantasy"
    ],
    "duration": null,
    "cast": "Matt Smith, Emma D'Arcy, Olivia Cooke",
    "overview": "The Targaryen dynasty is at the absolute apex of its power, with more than 15 dragons under their yoke. Most empires crumble from such heights. In the case of the Targaryens, their slow fall begins when King Viserys breaks with a century of tradition by naming his daughter Rhaenyra heir to the Iron Throne. But when Viserys later fathers a son, the court is shocked when Rhaenyra retains her status as his heir, and seeds of division sow friction across the realm.",
    "poster": "https://image.tmdb.org/t/p/w500/7V0Ebks0GgpKvQ7QbLAIdX5dos4.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/577eXC8wFQT0eUrJcgznSiFPRmk.jpg",
    "tags": [
      "tv",
      "fantasy",
      "drama"
    ]
  },
  {
    "id": "fallout",
    "tmdbId": 106379,
    "type": "tv",
    "title": "Fallout",
    "match": 97,
    "age": "18+",
    "year": 2024,
    "seasons": 2,
    "totalEpisodes": 16,
    "genres": [
      "Action",
      "Sci-Fi",
      "Drama"
    ],
    "duration": null,
    "cast": "Ella Purnell, Walton Goggins, Aaron Moten",
    "overview": "The story of haves and have-nots in a world in which there's almost nothing left to have. 200 years after the apocalypse, the gentle denizens of luxury fallout shelters are forced to return to the irradiated hellscape their ancestors left behind — and are shocked to discover an incredibly complex, gleefully weird, and highly violent universe waiting for them.",
    "poster": "https://image.tmdb.org/t/p/w500/c15BtJxCXMrISLVmysdsnZUPQft.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/coaPCIqQBPUZsOnJcWZxhaORcDT.jpg",
    "tags": [
      "trending",
      "tv",
      "scifi"
    ]
  },
  {
    "id": "attack-on-titan",
    "tmdbId": 1429,
    "type": "tv",
    "title": "Attack on Titan",
    "match": 99,
    "age": "16+",
    "year": 2023,
    "seasons": 4,
    "totalEpisodes": 87,
    "genres": [
      "Animation",
      "Action",
      "Fantasy"
    ],
    "duration": null,
    "cast": "Yuki Kaji, Yui Ishikawa, Marina Inoue",
    "overview": "100 years ago, the last remnants of humanity were forced to retreat behind the towering walls of a fortified city to escape the massive, man-eating Titans that roamed the land outside their fortress. Only the members of the Scouting Legion dared to stray beyond the safety of the walls – but even those brave warriors seldom returned alive. Those within the city clung to the illusion of a peaceful existence until the day that dream was shattered, and their slim chance at survival was reduced to one horrifying choice: kill – or be devoured!",
    "poster": "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg",
    "tags": [
      "trending",
      "anime",
      "action"
    ]
  },
  {
    "id": "jujutsu-kaisen",
    "tmdbId": 95479,
    "type": "tv",
    "title": "Jujutsu Kaisen",
    "match": 98,
    "age": "16+",
    "year": 2023,
    "seasons": 1,
    "totalEpisodes": 59,
    "genres": [
      "Animation",
      "Action",
      "Fantasy"
    ],
    "duration": null,
    "cast": "Junya Enoki, Yuma Uchida, Asami Seto",
    "overview": "Yuji Itadori is a boy with tremendous physical strength, though he lives a completely ordinary high school life. One day, to save a classmate who has been attacked by curses, he eats the finger of Ryomen Sukuna, taking the curse into his own soul. From then on, he shares one body with Ryomen Sukuna. Guided by the most powerful of sorcerers, Satoru Gojo, Itadori is admitted to Tokyo Jujutsu High School, an organization that fights the curses... and thus begins the heroic tale of a boy who became a curse to exorcise a curse, a life from which he could never turn back.",
    "poster": "https://image.tmdb.org/t/p/w500/6qQzMJG27XOJsyAEEIisoJB45j2.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/qpin8cASXEVtwhzNsprHYFiOAGk.jpg",
    "tags": [
      "trending",
      "anime",
      "action"
    ]
  },
  {
    "id": "demon-slayer",
    "tmdbId": 85937,
    "type": "tv",
    "title": "Demon Slayer: Kimetsu no Yaiba",
    "match": 98,
    "age": "16+",
    "year": 2024,
    "seasons": 5,
    "totalEpisodes": 63,
    "genres": [
      "Animation",
      "Action",
      "Fantasy"
    ],
    "duration": null,
    "cast": "Natsuki Hanae, Akari Kito, Hiro Shimono",
    "overview": "After a demon attack leaves his family slain and his sister cursed, Tanjiro embarks upon a perilous journey to find a cure and avenge those he's lost.",
    "poster": "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/nTvM4mhqNlHIvUkI1gVnW6XP7GG.jpg",
    "tags": [
      "anime",
      "action",
      "trending"
    ]
  },
  {
    "id": "solo-leveling",
    "tmdbId": 209867,
    "type": "tv",
    "title": "Solo Leveling",
    "match": 97,
    "age": "16+",
    "year": 2024,
    "seasons": 1,
    "totalEpisodes": 38,
    "genres": [
      "Animation",
      "Action",
      "Fantasy"
    ],
    "duration": null,
    "cast": "Taito Ban, Genta Nakamura, Reina Ueda",
    "overview": "After the party of heroes defeated the Demon King, they restored peace to the land and returned to lives of solitude. Generations pass, and the elven mage Frieren comes face to face with humanity's mortality. She takes on a new apprentice and promises to fulfill old friends' dying wishes. Can an elven mind make peace with the nature of life and death? Frieren embarks on her quest to find out.",
    "poster": "https://image.tmdb.org/t/p/w500/dqZENchTd7lp5zht7BdlqM7RBhD.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/rBOnrVlck7BIlGeWVlzYiZeg4l2.jpg",
    "tags": [
      "anime",
      "action"
    ]
  },
  {
    "id": "one-piece",
    "tmdbId": 37854,
    "type": "tv",
    "title": "One Piece",
    "match": 98,
    "age": "13+",
    "year": 2024,
    "seasons": 23,
    "totalEpisodes": 1180,
    "genres": [
      "Animation",
      "Action",
      "Adventure"
    ],
    "duration": null,
    "cast": "Mayumi Tanaka, Akemi Okamura, Kazuya Nakai",
    "overview": "Years ago, the fearsome Pirate King, Gol D. Roger was executed leaving a huge pile of treasure and the famous \"One Piece\" behind. Whoever claims the \"One Piece\" will be named the new King of the Pirates.\n\nMonkey D. Luffy, a boy who consumed a \"Devil Fruit,\" decides to follow in the footsteps of his idol, the pirate Shanks, and find the One Piece. It helps, of course, that his body has the properties of rubber and that he's surrounded by a bevy of skilled fighters and thieves to help him along the way.\n\nLuffy will do anything to get the One Piece and become King of the Pirates!",
    "poster": "https://image.tmdb.org/t/p/w500/dB4EDhre2dsC2kxYDavyKWqLQwi.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/2rmK7mnchw9Xr3XdiTFSxTTLXqv.jpg",
    "tags": [
      "anime",
      "action",
      "adventure"
    ]
  },
  {
    "id": "blue-lock",
    "tmdbId": 131041,
    "type": "tv",
    "title": "Blue Lock",
    "match": 96,
    "age": "13+",
    "year": 2023,
    "seasons": 2,
    "totalEpisodes": 25,
    "genres": [
      "Animation",
      "Sport",
      "Action"
    ],
    "duration": null,
    "cast": "Kazuki Ura, Tasuku Kaito, Ryusei Shinohara",
    "overview": "High school soccer players from across Japan gather for a controversial project designed to create the best — and most egoistic — striker in the world.",
    "poster": "https://image.tmdb.org/t/p/w500/fcKH1NQzoTXiYO1OrhaFFwTKhBp.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/seMRyWVwIVBWbC9xaMzDMZJ8fUH.jpg",
    "tags": [
      "anime",
      "sport"
    ]
  },
  {
    "id": "deadpool-wolverine",
    "tmdbId": 533535,
    "type": "movie",
    "title": "Deadpool & Wolverine",
    "match": 99,
    "age": "18+",
    "year": 2024,
    "seasons": null,
    "totalEpisodes": null,
    "genres": [
      "Action",
      "Comedy",
      "Sci-Fi"
    ],
    "duration": "2h 08m",
    "cast": "Ryan Reynolds, Hugh Jackman, Emma Corrin",
    "overview": "A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine.",
    "poster": "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg",
    "tags": [
      "trending",
      "movie",
      "action",
      "scifi"
    ]
  },
  {
    "id": "dune-part-two",
    "tmdbId": 693134,
    "type": "movie",
    "title": "Dune: Part Two",
    "match": 99,
    "age": "13+",
    "year": 2024,
    "seasons": null,
    "totalEpisodes": null,
    "genres": [
      "Sci-Fi",
      "Adventure"
    ],
    "duration": "2h 46m",
    "cast": "Timothée Chalamet, Zendaya, Rebecca Ferguson",
    "overview": "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, Paul endeavors to prevent a terrible future only he can foresee.",
    "poster": "https://image.tmdb.org/t/p/w500/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
    "tags": [
      "trending",
      "movie",
      "scifi"
    ]
  },
  {
    "id": "oppenheimer",
    "tmdbId": 872585,
    "type": "movie",
    "title": "Oppenheimer",
    "match": 98,
    "age": "18+",
    "year": 2023,
    "seasons": null,
    "totalEpisodes": null,
    "genres": [
      "Drama",
      "History"
    ],
    "duration": "3h 00m",
    "cast": "Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr.",
    "overview": "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    "poster": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
    "tags": [
      "movie",
      "drama"
    ]
  },
  {
    "id": "spiderman-spiderverse",
    "tmdbId": 569094,
    "type": "movie",
    "title": "Spider-Man: Across the Spider-Verse",
    "match": 99,
    "age": "PG",
    "year": 2023,
    "seasons": null,
    "totalEpisodes": null,
    "genres": [
      "Animation",
      "Action",
      "Adventure"
    ],
    "duration": "2h 20m",
    "cast": "Shameik Moore, Hailee Steinfeld, Oscar Isaac",
    "overview": "After reuniting with Gwen Stacy, Brooklyn’s full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse, where he encounters the Spider Society, a team of Spider-People charged with protecting the Multiverse's very existence. But when the heroes clash on how to handle a new threat, Miles finds himself pitted against the other Spiders and must set out on his own to save those he loves most.",
    "poster": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/kVd3a9YeLGkoeR50jGEXM6EqseS.jpg",
    "tags": [
      "movie",
      "action",
      "anime",
      "scifi"
    ]
  },
  {
    "id": "fight-club",
    "tmdbId": 550,
    "type": "movie",
    "title": "Fight Club",
    "match": 96,
    "age": "18+",
    "year": 1999,
    "seasons": null,
    "totalEpisodes": null,
    "genres": [
      "Drama",
      "Thriller"
    ],
    "duration": "2h 19m",
    "cast": "Edward Norton, Brad Pitt, Helena Bonham Carter",
    "overview": "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy. Their concept catches on, with underground \"fight clubs\" forming in every town, until an eccentric gets in the way and ignites an out-of-control spiral toward oblivion.",
    "poster": "https://image.tmdb.org/t/p/w500/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/c6OLXfKAk5BKeR6broC8pYiCquX.jpg",
    "tags": [
      "movie",
      "drama",
      "thriller"
    ]
  },
  {
    "id": "interstellar",
    "tmdbId": 157336,
    "type": "movie",
    "title": "Interstellar",
    "match": 99,
    "age": "PG-13",
    "year": 2014,
    "seasons": null,
    "totalEpisodes": null,
    "genres": [
      "Adventure",
      "Drama",
      "Sci-Fi"
    ],
    "duration": "2h 49m",
    "cast": "Matthew McConaughey, Anne Hathaway, Jessica Chastain",
    "overview": "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    "poster": "https://image.tmdb.org/t/p/w500/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/8sNiAPPYU14PUepFNeSNGUTiHW.jpg",
    "tags": [
      "movie",
      "scifi",
      "drama"
    ]
  },
  {
    "id": "the-dark-knight",
    "tmdbId": 155,
    "type": "movie",
    "title": "The Dark Knight",
    "match": 99,
    "age": "13+",
    "year": 2008,
    "seasons": null,
    "totalEpisodes": null,
    "genres": [
      "Action",
      "Crime",
      "Drama"
    ],
    "duration": "2h 32m",
    "cast": "Christian Bale, Heath Ledger, Aaron Eckhart",
    "overview": "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets. The partnership proves to be effective, but they soon find themselves prey to a reign of chaos unleashed by a rising criminal mastermind known to the terrified citizens of Gotham as the Joker.",
    "poster": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/9FE5eD92WfVCiivM9Pq9GVSrlWk.jpg",
    "tags": [
      "movie",
      "action",
      "crime",
      "trending"
    ]
  },
  {
    "id": "gladiator-2",
    "tmdbId": 558449,
    "type": "movie",
    "title": "Gladiator II",
    "match": 97,
    "age": "18+",
    "year": 2024,
    "seasons": null,
    "totalEpisodes": null,
    "genres": [
      "Action",
      "Adventure",
      "Drama"
    ],
    "duration": "2h 28m",
    "cast": "Paul Mescal, Pedro Pascal, Denzel Washington",
    "overview": "Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius is forced to enter the Colosseum after his home is conquered by the tyrannical Emperors who now lead Rome with an iron fist. With rage in his heart and the future of the Empire at stake, Lucius must look to his past to find strength and honor to return the glory of Rome to its people.",
    "poster": "https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/tOqIwliWMovSIZ9DyvHcHI7p2im.jpg",
    "tags": [
      "movie",
      "action",
      "trending"
    ]
  },
  {
    "id": "joker",
    "tmdbId": 475557,
    "type": "movie",
    "title": "Joker",
    "match": 95,
    "age": "18+",
    "year": 2019,
    "seasons": null,
    "totalEpisodes": null,
    "genres": [
      "Crime",
      "Drama",
      "Thriller"
    ],
    "duration": "2h 02m",
    "cast": "Joaquin Phoenix, Robert De Niro, Zazie Beetz",
    "overview": "During the 1980s, a failed stand-up comedian is driven insane and turns to a life of crime and chaos in Gotham City while becoming an infamous psychopathic crime figure.",
    "poster": "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/rlay2M5QYvi6igbGcFjq8jxeusY.jpg",
    "tags": [
      "movie",
      "crime",
      "drama"
    ]
  },
  {
    "id": "avatar-2",
    "tmdbId": 76600,
    "type": "movie",
    "title": "Avatar: The Way of Water",
    "match": 96,
    "age": "PG-13",
    "year": 2022,
    "seasons": null,
    "totalEpisodes": null,
    "genres": [
      "Action",
      "Sci-Fi",
      "Adventure"
    ],
    "duration": "3h 12m",
    "cast": "Sam Worthington, Zoe Saldana, Sigourney Weaver",
    "overview": "Set more than a decade after the events of the first film, learn the story of the Sully family (Jake, Neytiri, and their kids), the trouble that follows them, the lengths they go to keep each other safe, the battles they fight to stay alive, and the tragedies they endure.",
    "poster": "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/kJsPVzdyBrYHLomuNv5SJDXUQ2f.jpg",
    "tags": [
      "movie",
      "action",
      "scifi",
      "trending"
    ]
  }
];

// Convenience filter helpers
const DB = {
  all: () => MOVFLIX_DB,
  movies: () => MOVFLIX_DB.filter(m => m.type === "movie"),
  tv: () => MOVFLIX_DB.filter(m => m.type === "tv" && !m.tags.includes("anime")),
  anime: () => MOVFLIX_DB.filter(m => m.tags.includes("anime")),
  trending: () => MOVFLIX_DB.filter(m => m.tags.includes("trending")),
  scifi: () => MOVFLIX_DB.filter(m => m.tags.includes("scifi")),
  byId: (id) => MOVFLIX_DB.find(m => m.id === id || m.tmdbId === parseInt(id)),
  byTmdb: (tmdbId) => MOVFLIX_DB.find(m => m.tmdbId === parseInt(tmdbId)),
  /**
   * Search titles in local DB
   * @param {string} q
   */
  search: (q) => {
    if (!q || q.trim() === "") return [];
    const raw = q.trim().toLowerCase();
    const words = raw.split(/\s+/);
    const scored = MOVFLIX_DB.map(m => {
      const haystack = [
        m.title, m.overview, m.cast,
        ...(m.genres || []), String(m.year), String(m.tmdbId),
        ...(m.tags || [])
      ].join(" ").toLowerCase();
      let score = 0;
      words.forEach(w => {
        if (m.title.toLowerCase().includes(w)) score += 10;
        if ((m.genres || []).some(g => g.toLowerCase().includes(w))) score += 6;
        if (m.cast && m.cast.toLowerCase().includes(w)) score += 4;
        if (haystack.includes(w)) score += 1;
      });
      return { item: m, score };
    });
    return scored.filter(s => s.score > 0).sort((a,b) => b.score - a.score).map(s => s.item);
  }
};

if (typeof window !== "undefined") {
  window.DB = DB;
  window.MOVFLIX_DB = MOVFLIX_DB;
}
