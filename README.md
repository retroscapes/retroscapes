# retroscapes
The **retroscapes** library helps define and build isometric renderings of procedurally generated landscapes, with particular support for the HTML Canvas API. Interactive examples can be found at [retroscapes.io](https://retroscapes.io).

## Usage

Any released version of the retroscapes library can be incorporated as shown below (`0.1.0` can be replaced with the version number of any release) within non-commercial, open-source projects.
```html
<script src="https://retroscapes.codes/0.1.0/retroscapes.js"></script>
```

## Conventions

Style conventions are enforced using [ESLint](https://eslint.org/):
```shell
npm i --save-dev eslint eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-promise
eslint src/retroscapes.js
```
