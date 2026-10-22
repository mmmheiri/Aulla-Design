/** Owner-requested shopping option; original imported product records stay intact. */
export const CUSTOM_SIZE = 'تفصيل حسب المقاس';
export const isTailoredSize = value => typeof value === 'string' && /تفصيل/.test(value);

/** Preserve existing stored values, including legacy custom-size strings. */
export function tailoringSizes(values = []) {
  return values.some(isTailoredSize) ? [...values] : [...values, CUSTOM_SIZE];
}

/** @param {{optionGroups: {id:string,name:string,values:string[]}[]}} product */
export function tailoringSizeGroup(product) {
  const group = product.optionGroups.find(g => g.name === 'Size');
  return group ? {...group, values:tailoringSizes(group.values)} : {id:'aulla-custom-size',name:'Size',values:[CUSTOM_SIZE]};
}
