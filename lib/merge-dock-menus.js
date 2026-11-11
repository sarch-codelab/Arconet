import { visibleDockMenu } from "./dock-menu";

// Combina las dos configuraciones validadas. Solo une entradas con el mismo ID
// y los mismos campos: si hay diferencias, conserva ambas versiones. Nunca
// modifica los originales y reasigna IDs duplicados de forma determinista.
export function mergeDockMenus(first, second) {
  const result = structuredClone(first);
  const ids = new Set();
  const collect = (item) => { ids.add(item.id); for (const group of item.groups) { ids.add(group.id); for (const link of group.links) ids.add(link.id); } };
  result.items.forEach(collect);
  result.legal.forEach(link => ids.add(link.id));
  let serial = 0;
  const newId = (id) => {
    if (!ids.has(id)) { ids.add(id); return id; }
    let next; do { next = `combinado-${++serial}`; } while (ids.has(next));
    ids.add(next); return next;
  };
  const sameLink = (a, b) => a.label === b.label && a.href === b.href && a.enabled === b.enabled;
  const cloneLink = link => ({ ...link, id: newId(link.id) });
  const cloneGroup = group => ({ ...group, id: newId(group.id), links: group.links.map(cloneLink) });
  const cloneItem = item => ({ ...item, id: newId(item.id), groups: item.groups.map(cloneGroup) });
  const combineLinks = (target, incoming) => {
    for (const link of incoming) {
      const match = target.find(entry => entry.id === link.id);
      if (!match || !sameLink(match, link)) target.push(cloneLink(link));
    }
  };
  for (const item of second.items) {
    const match = result.items.find(entry => entry.id === item.id);
    if (!match || !sameLink(match, item)) { result.items.push(cloneItem(item)); continue; }
    for (const group of item.groups) {
      const previous = match.groups.find(entry => entry.id === group.id);
      if (!previous || previous.title !== group.title || previous.enabled !== group.enabled) match.groups.push(cloneGroup(group));
      else combineLinks(previous.links, group.links);
    }
  }
  combineLinks(result.legal, second.legal);
  const secondary = visibleDockMenu(second).primary;
  const primary = visibleDockMenu(first).primary;
  if (!sameLink(primary, secondary) && !result.items.some(item => sameLink(item, secondary))) {
    result.items.push({ id: newId("acceso-menu-2"), label: secondary.label, href: secondary.href, enabled: secondary.enabled, groups: [] });
  }
  return result;
}
