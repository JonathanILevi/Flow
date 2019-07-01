import {div,Div} from "/modules/Div.m.js";

export function create(...args) {
	let line = div("div","line");
	move(line,...args);
	return line;
}
export function createEmpty() {
	let line = div("div","line");
	return line;
}
export function move(el,from,to) {
	let r,midX,midY,slope;
	{
		let [x1,y1] = from;
		let [x2,y2] = to;
		
		r	= Math.sqrt(  ((x1-x2)*(x1-x2))  +  ((y1-y2)*(y1-y2))  );
		midX	= (x1+x2)/2;
		midY	= (y1+y2)/2;
		slope	= (Math.atan2(y1-y2,x1-x2))	*180/Math.PI;
	}
	el.style.width	= r+"px"	;
	el.style.left	= (midX-r/2) + "px"	;
	el.style.top	= midY+"px"	;
	el.style.transform	= "rotate("+slope+"deg)"	;
}



