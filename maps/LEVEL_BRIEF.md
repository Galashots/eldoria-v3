# Realm of Eldoria — Level Design Brief

> Extracted from the original build. **The old square layouts were deliberately
> dropped.** This brief is *what each level needs to contain and connect to* —
> the progression, not the shape. Design something more organic in Tiled.

Progression (linear): `farm  →  town  →  wilds  →  deepwoods  →  mine`

## Back to the Farm!  `(farm)`

- **Connections:** **town** → (right edge)
- **Enemies:** none (safe area)

**Design freedom:** keep the connections and contents above; everything else —
shape, paths, water, decoration, secret corners — is yours to reinvent. Place a
`spawn` object and edge `exit` objects in Tiled; NPCs/enemies become object markers.

## Welcome to Town!  `(town)`

- **Connections:** ← **farm** (left edge)  ·  **wilds** → (right edge)
- **NPCs:** Mira (quests), Bram (shop), Gunnar (forge)
- **Features:** seed/crystal shop, forge, quest giver
- **Enemies:** none (safe area)

**Design freedom:** keep the connections and contents above; everything else —
shape, paths, water, decoration, secret corners — is yours to reinvent. Place a
`spawn` object and edge `exit` objects in Tiled; NPCs/enemies become object markers.

## Into the Wilds!  `(wilds)`

- **Connections:** ← **town** (left edge)  ·  **deepwoods** → (right edge)
- **Enemy trail (easy → hard):** slime → bat → goblin

**Design freedom:** keep the connections and contents above; everything else —
shape, paths, water, decoration, secret corners — is yours to reinvent. Place a
`spawn` object and edge `exit` objects in Tiled; NPCs/enemies become object markers.

## The Deep Woods... be careful!  `(deepwoods)`

- **Connections:** ← **wilds** (left edge)  ·  **mine** → (right edge)
- **Enemy trail (easy → hard):** wolf → bear → troll → shadow_warden

**Design freedom:** keep the connections and contents above; everything else —
shape, paths, water, decoration, secret corners — is yours to reinvent. Place a
`spawn` object and edge `exit` objects in Tiled; NPCs/enemies become object markers.

## The Mine... danger ahead!  `(mine)`

- **Connections:** ← **deepwoods** (left edge)
- **Enemy trail (easy → hard):** rock_golem → magma_slug → crystal_wyrm

**Design freedom:** keep the connections and contents above; everything else —
shape, paths, water, decoration, secret corners — is yours to reinvent. Place a
`spawn` object and edge `exit` objects in Tiled; NPCs/enemies become object markers.
