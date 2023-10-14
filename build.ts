const output = await Bun.build({
  entrypoints: ['./src/views/js/audio-preview.js'],
  outdir: './public/assets/js',
  naming: '[dir]/[name].min.[ext]',
  target: 'browser',
  minify: true,
});

console.log(output.outputs);

export {};
