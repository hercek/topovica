# Topovica

It's an acronym for "The Only Parts Of Vimperator I Care About". This project exists because as of version [57](https://www.mozilla.org/en-US/firefox/57.0/releasenotes/), the [Vimperator](http://vimperator.org/) extension will no longer work. Over the years, I have acquired significant muscle memory in browsing with Vimperator and, while there are other extensions that present similar interfaces, they are just different enough to be jarring. Instead of retraining, it's probably more fun to reimplement the subset of Vimperator that I am used to, so that's what I am going to do.

## Currently implemented

### Command mode

#### Page Movements

`h`,`j`,`k`,`l` &rarr; left, down, up and right, respectively 

`gg`, `G` &rarr; top of page, bottom of page

#### Tab movements

`gt`, `gT`, `g^`, `g$` &rarr; next tab, previous tab, first tab, last tab, respectively

`b` &rarr; brings up the buffer selector interface. type in the index of the buffer or the title of the buffer. pressing `Enter` jumps to first match

#### Tab creation/deletion

`d` &rarr; delete: close tab

`u` &rarr; undo: restore most recently deleted tab

#### Navigation

`:open`, `:o`, `o` &rarr; opens a url or does a search in the current tab.

`:tabnew` &rarr; opens a url or does a search in a new tab.

`CTRL-I`, `CTRL-O` &rarr; forward and back

`f`, `F` &rarr; displays indexes for links: typing in those indexes follows the link in the current tab or a new tab, respectively

### Insert mode

We currently detect insert mode when currently focused element is `input`, `textarea` or `select`.

## Credits

I referred to existing projects when I encountered functionality I couldn't figure out how to implement.

- `:open`: [vim-vixen](https://github.com/ueokande/vim-vixen)
