const output = await Bun.build({
  entrypoints: ['./src/views/js/audio-preview.js', './src/views/js/search-bar.js'],
  outdir: './public/assets/js',
  naming: '[dir]/[name].min.[ext]',
  target: 'browser',
  minify: true,
});

console.log(output.outputs);

export {};
