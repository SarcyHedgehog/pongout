# Pongout (Croquet JS rewrite)

This branch represents the migration of Pongout to the Croquet 2.0 JavaScript framework via Multisynq, enabling real-time deterministic multiplayer sync.

## What's working

- Basic view and model architecture using Croquet `Session.join`
- Multiplayer view instantiation works — logs show multiple views connecting
- Canvas and styling render correctly, no visual errors in the DOM
- Code structure follows the pattern of the working Multicar example

## What's blocked

- 🐛 Runtime error: `Cannot set property viewId of #<Cd> which has only a getter`
- Attempts to manually set `this.viewId = ...` fail, because `viewId` is read-only in Croquet.View
- Fixes such as using `autoSession()` or accessing `this.session.viewId` directly also led to different failures or white screen
- Multicar and other examples assign `viewId` only within the Model or use it as a key, not override it
- Likely issue is misunderstanding of how to link `viewId` to input handling without overwriting a Croquet-managed property

## Next Steps

- Review how Multicar and Croquet View patterns avoid `this.viewId` overrides
- Possibly refactor to treat `viewId` as immutable and work with alternate identifiers
- May require review from someone with deeper Croquet internals familiarity

