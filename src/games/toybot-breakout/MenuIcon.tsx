import { UI_MENU_ICONS } from './art';

const CELLS={battle:0,garage:1,training:2,story:3,world:4,settings:5} as const;
export default function MenuIcon({name}:{name:keyof typeof CELLS}){
 const cell=CELLS[name];
 return <span className="menu-icon" aria-hidden="true" style={{backgroundImage:`url(${UI_MENU_ICONS})`,backgroundPosition:`${cell%3*50}% ${Math.floor(cell/3)*100}%`}}/>;
}
