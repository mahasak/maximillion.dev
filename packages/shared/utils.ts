var colors = require('colors');

export const debug = (label: string, ...data: any[]) => {
  console.log(colors.yellow(`---------- debug: ${label} ----------`))
  data.forEach(item => console.log(colors.yellow(item)))
}