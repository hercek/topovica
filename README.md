# Topovica

It's an acronym for "The Only Parts Of Vimperator I Care About". This project exists because as of version [57](https://www.mozilla.org/en-US/firefox/57.0/releasenotes/), the [Vimperator](http://vimperator.org/) extension will no longer work. Over the years, I have acquired significant muscle memory in browsing with Vimperator and, while there are other extensions that present similar interfaces, they are just different enough to be jarring. Instead of retraining, it's probably more fun to reimplement the subset of Vimperator that I am used to, so that's what I am going to do.

## Currently implemented

### Command mode

#### Page Movements

`h`,`j`,`k`,`l` &rarr; left, down, up and right, respectively 

`gg` &rarr; top of page

#### Tab movements

`gt`, `gT`, `g^`, `g$` &rarr; next tab, previous tab, first tab, last tab, respectively

#### Tab creation/deletion

`d` &rarr; delete: close tab
`u` &rarr; undo: restore most recently closed tab
