const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'movieshelf-desktop', 'movieshelf.db');
const db = new Database(dbPath);

const actorCount = db.prepare('SELECT COUNT(*) as count FROM actors').get().count;
const relationCount = db.prepare('SELECT COUNT(*) as count FROM film_actor').get().count;
const sampleMovies = db.prepare('SELECT id, title, remote_id FROM movies LIMIT 5').all();
const sampleActors = db.prepare('SELECT id, name, remote_id FROM actors LIMIT 5').all();

console.log('--- Database Stats ---');
console.log('Actors:', actorCount);
console.log('Film/Actor Relations:', relationCount);
console.log('Sample Movies:', sampleMovies);
console.log('Sample Actors:', sampleActors);
