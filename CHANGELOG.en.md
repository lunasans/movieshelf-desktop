# Changelog (English)

Only feature releases (`x.y.0`) are listed here. They are the ones submitted to winget,
and this file is where their release notes come from — see `packaging/winget/README.md`.
Bugfix releases are documented in `CHANGELOG.md` only.

Keep the heading format identical to `CHANGELOG.md` (`## [x.y.z] - YYYY-MM-DD`); the
release workflow cuts the section out by matching it.

## [1.1.0] - 2026-08-15

Ratings and episode progress now actually reach the shelf — and the sync finally
says what it is about to transfer.

### New

- **The connected account is shown in the settings.** Until now the app never showed which account it was signed in with. That only becomes apparent when it is the wrong one: ratings do arrive, but never show up in the shelf, because the view there filters by the signed-in user. Connection now lists name, email and id, plus a button to check again. If the login has expired, it says so in plain words (#116).
- **Counting this installation is now possible, voluntarily.** A switch under Updates, off by default. When switched on, a random identifier and the installed version travel along with the version check the app makes anyway — to movieshelf.info, not to your shelf, with no link to your account and no IP address. You are asked once on first start, with "No" preselected (#118).

### Fixed

- **The preview kept quiet about what goes to the shelf.** Under "Desktop → Shelf" it showed only the title, without a word about what changes — the paragraph listing the changed fields was missing from that list, while the opposite direction had it all along (#117).
- **Pending ratings counted as "no changes".** Ratings and episode progress deliberately do not hang off the film's timestamp, otherwise every click on a star would trigger a full transfer. As a result they fell out of the count: the page reported "up to date" while something was in fact pending. Both now appear in the preview, with episodes grouped per series (#117).
- **Error messages about episodes named a database id.** Instead of "Episode 4711" they now name the series along with the episode title (#117).

### Internal

- The winget submission fills in the release notes per language. komac has no flag for this and writes them into the default locale only, which has been English since 1.0.0 — without this step German text would end up in the English manifest file. Feature releases therefore need a section in `CHANGELOG.en.md` from now on (#115).

**Note:** Ratings and episode progress require shelf 2.41.2 or newer. Before
that, sending them failed and pulling them never delivered anything.

---

## [1.0.0] - 2026-08-15

The interface now follows the Web Shelf throughout. Since that leaves hardly any view
untouched, this release carries the 1.0.0.

### New

- **The look matches the Web Shelf.** Rose instead of indigo as the brand colour, glass surfaces instead of flat cards, and the same ten colour schemes — among them Christmas, Halloween and Summer. Implemented through the colour palette itself rather than through individual views: the scales are derived from the accent colour, which is why every corner follows the chosen scheme. The seasonal schemes additionally carry their own surface tint, because Christmas without fir green would only be a second red (#107).
- **Dashboard modelled on the Shelf.** A hero area with rotating recommendations, below it horizontally scrolling rows for "Recently added", films and series. The search bar sits on the lower edge of the hero, as it does there, and leads into the film list. The statistics have moved off the start page into their own entry in the sidebar (#113).
- **Your own rating, out of five stars.** Kept separate from the TMDb score, which still sits next to it. Clicking the same star again takes the rating back (#109).
- **Age ratings are finally shown.** The field could always be filled in, but never appeared in the detail view. It now shows the seal, or a text entry for age levels without one (#109).
- **Watched state per episode and season.** Series could be imported, but no progress could be recorded — the database had no such field at all. The season row now reads "3/8" instead of the bare episode count. A season counts as watched only once every episode is marked (#111).
- **Ratings and episode progress reach the Shelf.** Both are synced in either direction, as the watched state for films already was. Requires Shelf 2.41.0 or newer (#112).
- **Find duplicates.** A new area in the settings looks for films held more than once — by the same TMDb id, and by title and year. A film and a series of the same name do not count as a duplicate (#110).
- **TMDb runs through the Shelf in online mode.** Anyone signed in no longer needs their own TMDb key; in standalone mode your own key still applies (#105).

### Fixed

- **Sorting respected upper and lower case.** That put "EUReKA" ahead of "Emergency Room", in the list as well as on the dashboard. Boxset contents, search, list names and actors were affected too (#109).
- **Freshly fetched films counted as unwatched.** When created from a sync, the recorded watched state stayed empty, the row counted as "not yet transferred", and the next sync pushed up a state the Shelf had long had (#103).
- **"Load from TMDb" took two attempts.** Videos now arrive together with the record, as they already did in the series branch (#104).

### Internal

- The winget description is prepared in two languages; from this release on, `en-US` is the default locale (#106).
