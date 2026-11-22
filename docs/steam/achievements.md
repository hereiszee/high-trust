# Steam achievements

The game unlocks these through one function, `HT.Steam.unlock(id)` in `js/platform.js`. It is a no-op on the web and when Steam is not running.

**How they fire.** `HT.Steam.check()` runs every achievement test below against the save (`HT.Save.data`) each time the save is written or loaded. The save is written at job completion (`jobs[id].done`, medals), the finale (`flags.festival`), easter egg finds (`base.eggs`), purchases and cash. So no job file calls Steam directly, nothing in the game code had to change, and a player who earned something before the Steam build existed gets it on their first launch. Steam ignores repeat unlocks.

**Setting them up in Steamworks.** Create each one under *App Admin → Stats & Achievements → Achievements* with the API name in the first column, exactly as written. Each also needs a 256×256 icon, plus a grey locked icon. Then publish. This list and `ACHIEVEMENTS` in `js/platform.js` must stay in step.

| API name | Name | Description | Unlocks when (save fields) |
|---|---|---|---|
| `ACH_FIRST_JOB` | Clocked In | Finish your first job. | `doneCount(s)>=1` |
| `ACH_RETURN_TO_SENDER` | Return to Sender | Get the neighborhood's packages back from the chop shop on Industrial Way. | `J(s,'gary')` |
| `ACH_FOURTH_QUARTER` | Fourth Quarter | Smash the stash tables in the duplex on Birch before the clock runs out. | `J(s,'rick')` |
| `ACH_BLOCK_PARTY` | Block Party | Hold Linden Park through every wave. | `J(s,'dave')` |
| `ACH_KINGPIN` | The Kingpin | Find the Porch Pirate King and give him the chance to surrender. | `J(s,'doug')` |
| `ACH_BRIDGE` | Over the Bridge | Open the bridge to Riverside. | `!!(s.world&&s.world.bridgeOpen)` |
| `ACH_RIVERSIDE` | Riverside Regular | Finish End of the Line, Fellowship Hall, Garden Variety and Brain Freeze. | `['earl','dee','rosa','benny'].every(id=>J(s,id))` |
| `ACH_THE_DUKE` | The Duke | Bring down the Duke. | `J(s,'duke')` |
| `ACH_PORCH_LIGHT` | Porch Light | Finish Porch Light. | `J(s,'porch')` |
| `ACH_DAD_TAXI` | Dad Taxi | Finish Dad Taxi. | `J(s,'taxi')` |
| `ACH_EXHIBIT_HOA` | Exhibit HOA | Finish Exhibit HOA. | `J(s,'hoa')` |
| `ACH_BUSY_WEEKEND` | Busy Weekend | Finish 15 different jobs. | `doneCount(s)>=15` |
| `ACH_EVERYBODY_WAVES` | Everybody Waves | See the festival through to the end. | `!!(s.flags&&s.flags.festival)\|\|J(s,'finale')` |
| `ACH_GOLD_STAR` | Gold Star | Earn a gold medal on any job. | `golds(s)>=1` |
| `ACH_HONOR_ROLL` | Honor Roll | Earn gold medals on 10 jobs. | `golds(s)>=10` |
| `ACH_DUE_PROCESS` | Due Process | Zip-tie 25 people who gave up. | `(s.prog&&s.prog.cuffed\|0)>=25` |
| `ACH_DOORS_UNLOCKED` | Doors Unlocked | Raise Maple Heights trust to 80%. | `(s.prog&&+s.prog.trust\|\|0)>=80` |
| `ACH_SIDE_HUSTLE` | Side Hustle | Earn $10,000 in total. | `(s.stats&&+s.stats.earned\|\|0)>=10000` |
| `ACH_FIRST_FIND` | Things Your Dad Found | Find your first easter egg. | `eggs(s)>=1` |
| `ACH_PROOF` | Proof | Hit the cardboard Bigfoot on the range berm. | `!!(s.base&&s.base.eggs&&s.base.eggs.bigfoot)` |
| `ACH_SEEN_IT_ALL` | Seen It All | Find all seven things around town. | `eggs(s)>=7` |
| `ACH_CLEARED_FOR_TAKEOFF` | Cleared for Takeoff | Take the jet up at Fort Sensible. | `(s.base&&s.base.jet&&s.base.jet.flights\|0)>=1` |
| `ACH_BORROWED` | Borrowed, Technically | Borrow the tank at Fort Sensible. | `(s.base&&s.base.tank&&s.base.tank.borrows\|0)>=1` |
| `ACH_EIGHTH_MILE` | Eighth-Mile Dad | Make a full pass at Sensible Dragway. | `(s.strip&&s.strip.stats&&s.strip.stats.passes\|0)>=1` |
| `ACH_TOP_OF_THE_LADDER` | Top of the Ladder | Beat every racer on the Sensible Dragway ladder. | every id in `LADDER_IDS` (dutch, marisol, walt, tomas, priya, june, rook) is in `s.strip.ladder.beaten` |
| `ACH_PERFECT_LIGHT` | Perfect Light | Cut a reaction time between .000 and .050 at the strip. | `!!(s.strip&&s.strip.stats&&s.strip.stats.perfect)` |

Helpers: `J(s,id)` = `s.jobs[id].done`; `doneCount` = number of jobs with `done`; `golds` = jobs with `medal>=3`; `eggs` = number of keys in `s.base.eggs`.

The four Maple Heights originals (`gary rick dave doug`) and the Riverside ones (`earl dee rosa benny duke`) are the save's legacy mission ids. `porch taxi hoa finale` are registry job ids (`js/jobs/*.js`).

## Rich presence

`HT.Steam.presence()` sets `status` and `text` to one line, such as *Out and about in Maple Heights*, *Driving around Riverside*, *On a job: Porch Light*, *At home* or *In the menus*. It also sets `steam_display` to `#Status`. For the Friends list to show it, upload a rich presence localization file under *Stats & Achievements → Rich Presence*:

```
"lang"
{
  "english"
  {
    "tokens"
    {
      "#Status"  "{%text%}"
    }
  }
}
```

Testing with app id 480 (Spacewar) only checks that the calls go through: Spacewar has its own achievements (`ACH_WIN_ONE_GAME` and others), so ours return false there. That is expected.
