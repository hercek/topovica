# FollowLink

This is a simplified subset of [Topovica](https://addons.mozilla.org/en-US/firefox/addon/topovica/) which is a subset of Vimperator. The idea is to use default Firefox shortcuts whenever they are available and use the Vimperator style when nothing appropriate is provided by Firefox. It is a pity that easy link following is not in Firefox by default.

## Currently implemented

### Command mode

#### Tab movements

`.` &rarr;  brings up the buffer selector interface. Typing will search buffers for matching indexes or titles, displaying them as hints. `Tab` or `Shift+Tab` cycles between hints. Pressing `Enter` jumps to the first match if no hint is selected, else to the selected hint

#### Navigation

`;`, `:` &rarr; displays indexes for links: typing in those indexes follows the link in the current tab or a new tab, respectively.

#### Misc

`,` &rarr; copies the current url to the clipboard

### Insert mode

We currently detect insert mode when currently focused element is `input`, `textarea` or `select`

## Credits

See credits of Topovica.


## Known issues

Topovica had some issues but this subset does not use the features with wonky behavior.

## License

[MIT](LICENSE)
