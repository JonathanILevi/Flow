
import {div,Div} from "/modules/Div.m.js";
import * as Line from "/modules/Line.m.js";


function workspace() {
	var nextBlockId = 0;
	var wsEl = div("div","workspace");
	var blocks = {};
	var selectedBlocks = [];
	var editingBlocks = [];
	var selectedNodes = [];
	
	class Block {
		constructor(id) {
			this.id = id==null?++nextBlockId+"":id;
			while (blocks.keys().indexOf(this.id)!=-1) this.id = ++nextBlockId+"";
			console.assert(typeof blocks[this.id] == "undefined");
			this.el = null;
			this.els = {title:null,inputs:{"in":null,"out":null},nodeColumns:{"in":null,"out":null}};
			this.pos = [0,0];
			this.selected = false;
			this.headerText = "";
			this.connections = {"in":[],"out":[]}
		}
	}
	class Node {
		constructor(block,dir) {
			this.el = null;
			this.block = block;
			this.dir = dir;
			this.text = "";
			this.selected = false;
			this.connections = [];
		}
	}
	class Connection {
		constructor(a,b) {
			this.a = a;
			this.b = b;
		}
	}
	
	function initBlockElement(block) {
		let el = block.el;
		emptyEl(el);
		let beforeEnter = "";// For newline location detection
		el.appendChild(div("div","block-header",e=>block.els.title=e,
			Div.event("keydown",(e)=>{
				////if (e.key=="Enter")
				////	e.preventDefault();
			}),
			Div.event("blur",(e)=>{
				block.headerText = e.target.innerText;
			}),
		));
		el.appendChild(div("div","block-content",
			div("div","block-nodeColumn","block-nodeColumn-left",e=>block.els.nodeColumns["in"]=e,),
			div("div","block-inputArea","block-inputArea-left",e=>block.els.inputs["in"]=e,
				Div.event("blur",(e)=>{
					updateBlockConnections("in",e.target.innerText);
				}),
			),
			div("div","block-padding"),
			div("div","block-inputArea","block-inputArea-right",e=>block.els.inputs["out"]=e,
				Div.event("blur",(e)=>{
					updateBlockConnections("out",e.target.innerText);
				}),
			),
			div("div","block-nodeColumn","block-nodeColumn-right",e=>block.els.nodeColumns["out"]=e,),
		));
		reloadBlockElement(block);
		
		function updateBlockConnections(dir, text) {
			let cons =	text	.split("\n")
					.map(t=>t.trim())
					.filter((t=>t!=""));
			while (block.connections[dir].length<cons.length)
				createNode(block,dir);
			while (block.connections[dir].length>cons.length)
				destroyNode(block.connections[dir].last());
			zip(block.connections[dir],cons).forEach(([n,t])=>setNodeText(n,t));
			reloadBlockElement(block);
		}
	}
	function reloadBlockElement(block) {
		let el = block.el;
		if (block.editing) {
			el.classList.add("-editing");
			block.els.title.setAttribute("contenteditable","true");
			block.els.inputs["in"].setAttribute("contenteditable","true");
			block.els.inputs["out"].setAttribute("contenteditable","true");
		}
		else {
			el.classList.remove("-editing");
			block.els.title.setAttribute("contenteditable","false");
			block.els.inputs["in"].setAttribute("contenteditable","false");
			block.els.inputs["out"].setAttribute("contenteditable","true");
		}
		
		block.els.title.innerText = block.headerText;
		emptyEl(block.els.inputs["in"]);
		emptyEl(block.els.inputs["out"]);
		connectionsElText("in").forEach(e=>block.els.inputs["in"].appendChild(e));
		connectionsElText("out").forEach(e=>block.els.inputs["out"].appendChild(e));
		emptyEl(block.els.nodeColumns["in"]);
		emptyEl(block.els.nodeColumns["out"]);
		block.connections["in"].forEach(n=>block.els.nodeColumns["in"].appendChild(n.el));
		block.connections["out"].forEach(n=>block.els.nodeColumns["out"].appendChild(n.el));
		
		function connectionsElText(dir) {
			return block.connections[dir]	.map(n=>n.text)
				.map(curry(Div.text))
				.concatMap(e=>[div("br"),e])
				.tail();
		}
	}
	
	
	function updateWSSize() {
		fitChildrenSize(wsEl);
	}
	
	
	function onBlockDrag(amount) {
		selectedBlocks.forEach(b=>{moveBlock(b,amount)});
	}
	function setBlockPos(block, pos) {
		block.pos = pos;
		block.el.style.left = pos[0]+"px";
		block.el.style.top = pos[1]+"px";
		updateBlockConnectionsPos(block);
		updateWSSize();
	}
	function moveBlock(block, amount) {
		setBlockPos(block, [block.pos[0]+amount[0],block.pos[1]+amount[1]]);
	}
	function selectBlock(block,deselectOthers=false) {
		if (deselectOthers) deselectAllBlocks(block);
		if (!block.selected) {
			selectedBlocks.push(block);
			block.selected=true;
			block.el.classList.add("-selected");
		}
		else {
			console.assert(selectedBlocks.indexOf(block)!=-1);
		}
	}
	function deselectBlock(block) {
		if (selectedBlocks.indexOf(block)!=-1) selectedBlocks.remove(block);
		block.selected=false;
		block.el.classList.remove("-selected");
	}
	function deselectAllBlocks(except) {
		[...selectedBlocks].filter(b=>b!=except).forEach(b=>deselectBlock(b));
	}
	function startEditingBlock(block,stopOthers=false) {
		if (stopOthers) stopEditingAllBlocks(block);
		editingBlocks.push(block);
		block.editing = true;
		reloadBlockElement(block);
	}
	function stopEditingBlock(block) {
		{
			let p = findParent(document.activeElement,e=>e==block.el);
			if (p!=null)
				document.activeElement.blur();
		}
		editingBlocks.remove(block);
		block.editing = false;
		reloadBlockElement(block);
	}
	function stopEditingAllBlocks(except) {
		[...editingBlocks].filter(b=>b!=except).forEach(b=>stopEditingBlock(b));
	}
	function createBlock(id=null) {
		let block = new Block(id);
		let blockMouseDown = false;
		let blockMouseDragged = false;
		let blockJustSelected = false;
		block.el = div("div","block",
			Div.event("pointerdown",(e)=>{
				if (!block.editing) {
					blockMouseDown = true;
					blockMouseDragged = false;
					if (!block.selected) {
						blockJustSelected = true;
						selectBlock(block, !(e.ctrlKey||e.shiftKey));
					}
					else blockJustSelected = false;
					e.target.setPointerCapture(e.pointerId);
					e.preventDefault();
				}
				e.stopPropagation();
			}),
			Div.event("pointerup",(e)=>{
				if (blockMouseDown) {
					blockMouseDown = false;
					if (!blockMouseDragged && !blockJustSelected && (e.ctrlKey||e.shiftKey))
						deselectBlock(block);
					e.target.releasePointerCapture(e.pointerId);
					e.preventDefault();
				}
				e.stopPropagation();
			}),
			Div.event("lostpointercapture",(e)=>{
				console.log("lostcapture",block.id);
				blockMouseDown = false;
			}),
			Div.event("pointermove",(e)=>{
				if (blockMouseDown) {
					onBlockDrag([e.movementX,e.movementY]);
					blockMouseDragged = true;
					e.preventDefault();
				}
				e.stopPropagation();
			}),
			
			Div.event("click",(e)=>{
				e.stopPropagation();
			}),
			Div.event("dblclick",(e)=>{
				if (!block.editing) {
					startEditingBlock(block);
					e.preventDefault();
				}
				e.stopPropagation();
			}),
		);
		wsEl.appendChild(block.el);
		blocks[block.id] = block;
		setBlockPos(block,[0,0]);
		initBlockElement(block);
		return block;
	}
	function destroyBlock(block) {
		deselectBlock(block);
		destroyConnections("in");
		destroyConnections("out");
		wsEl.removeChild(block.el);
		delete blocks[block.id];
		function destroyConnections(dir) {
			block.connections[dir].forEach(n=>destroyNode(n));
		}
	}
	
	
	
	function createNode(block,dir) {
		console.assert(dir=="in"||dir=="out");
		let node = new Node(block,dir);
		node.el = div("div","block-node",
			Div.event("pointerdown",(e)=>{
				selectNode(node, !(e.ctrlKey||e.shiftKey));
				e.preventDefault();
				e.stopPropagation();
			}),
			Div.event("pointerup",(e)=>{
				if (e.altKey)
					selectedNodes.forEach(n=>disconnectNodes(n,node));
				else
					selectedNodes.forEach(n=>connectNodes(n,node));
				if (!(e.ctrlKey||e.shiftKey)) deselectAllNodes();
				e.stopPropagation();
			}),
			Div.event("lostpointercapture",(e)=>{
				if (!(e.ctrlKey||e.shiftKey)) deselectAllNodes();
			}),
			Div.event("pointermove",(e)=>{
				e.stopPropagation();
			}),
			
			Div.event("click",(e)=>{
				e.stopPropagation();
			}),
			Div.event("dblclick",(e)=>{
				e.stopPropagation();
			}),
		);
		block.connections[dir].push(node);
		reloadBlockElement(block);
		return node;
	}
	function destroyNode(node) {
		node.connections.forEach(c=>disconnectNodes(c.a,c.b));
		node.block.connections[node.dir].remove(node);
		reloadBlockElement(node.block);
	}
	function setNodeText(node,text) {
		node.text = text;
		reloadBlockElement(node.block);
	}
	function selectNode(node,deselectOthers=false) {
		if (deselectOthers) deselectAllNodes(node);
		if (!node.selected) {
			selectedNodes.push(node);
			node.selected=true;
			node.el.classList.add("-selected");
		}
		else {
			console.assert(selectedNodes.indexOf(node)!=-1);
		}
	}
	function deselectNode(node) {
		if (selectedNodes.indexOf(node)!=-1) selectedNodes.remove(node);
		node.selected=false;
		node.el.classList.remove("-selected");
	}
	function deselectAllNodes(except) {
		[...selectedNodes].filter(b=>b!=except).forEach(b=>deselectNode(b));
	}
	function getNodeLocation(node) {
		return node.block.connections[node.dir].indexOf(node);
	}
	function testConnection(a,b) {
		return getConnection(a,b)!=null;
	}
	function getConnection(a,b) {
		for (let c of a.connections)
			if (c.a==b || c.b==b)
				return c
		return null;
	}
	function connectNodes(a,b) {
		if (a==b || testConnection(a,b)) return;
		let con = new Connection(a,b);
		con.line = Line.createEmpty();
		wsEl.append(con.line);
		a.connections.push(con);
		b.connections.push(con);
		updateConnectionPos(con);
	}
	function disconnectNodes(a,b) {
		let con = getConnection(a,b);
		if (con!=null) {
			wsEl.removeChild(con.line);
			a.connections.remove(con);
			b.connections.remove(con);
		}
	}
	function updateBlockConnectionsPos(block) {
		block.connections["in"].forEach(updateNodeConnectonsPos);
		block.connections["out"].forEach(updateNodeConnectonsPos);
	}
	function updateNodeConnectonsPos(node) {
		node.connections.forEach(curry(updateConnectionPos));
	}
	function updateConnectionPos(con) {
		Line.move(con.line,centerPos(con.a.el),centerPos(con.b.el));
		function centerPos(el) {
			let br = el.getBoundingClientRect();
			let wsbr = wsEl.getBoundingClientRect();
			return	[ br.left+br.width/2-wsbr.left	
				, br.top+br.height/2-wsbr.top	];
		}
	}
	
	
	
	
	
	function saveWorkspace() {
		return blocks.values().map(saveBlock);
		
		function saveBlock(block) {
			return	{ id:block.id
				, pos:block.pos
				, headerText:block.headerText
				, ins:saveConnections("in")
				, outs:saveConnections("out")
				};
			function saveConnections(dir) {
				return block.connections[dir].map(n=>	{return{ text:n.text
					, connections:n.connections.map(c=>{
						let cn = c.b;
						if (c.a!=n) cn = c.a;
						else console.assert(c.b!=n);
						return {block:cn.block.id,dir:cn.dir,node:getNodeLocation(cn),}
					  })
					,
					}});
			}
		}
	}
	function loadSave(data) {
		let idMap = {};
		data.forEach(bd=>loadBlock1(bd));
		data.forEach(bd=>loadBlock2(bd));
		
		function loadBlock1(d) {
			if (blocks.keys().indexOf(d.id)==-1)
				idMap[d.id] = d.id;
			else
				idMap[d.id] = ++nextBlockId+"";
			let block = createBlock(idMap[d.id]);
			loadConnections("in");
			loadConnections("out");
			selectBlock(block);
			function loadConnections(dir) {
				d[dir+"s"].forEach(n=>{ 
					createNode(block,dir);
				});
			}
		}
		function loadBlock2(d) {
			let block = blocks[idMap[d.id]];
			setBlockPos(block,d.pos);
			block.headerText = d.headerText;
			loadConnections("in");
			loadConnections("out");
			reloadBlockElement(block);
			updateBlockConnectionsPos(block);
			
			function loadConnections(dir) {
				zip(d[dir+"s"],block.connections[dir]).forEach(([nd,node])=>{
					node.text = nd.text;
					nd.connections.forEach(c=>connectNodes(node,blocks[idMap[c.block]].connections[c.dir][c.node]));
				});
			}
		}
	}
	

	function main() {
		let saveEl;
		let dragSelectionActive = false;
		let dragSelectionStart = null;
		wsEl.appendChild(div("button",Div.text("Add Block"),Div.event("click",(e)=>{
			createBlock();
		})));
		wsEl.appendChild(div("input","saveEl",e=>saveEl=e,Div.event("pointerdown",e=>e.stopPropagation()),
			Div.event("click",(e)=>{
				e.stopPropagation();
			}),
		));
		wsEl.appendChild(div("button",Div.text("Save"),Div.event("click",(e)=>{
			saveEl.value = JSON.stringify(saveWorkspace());
		})));
		wsEl.appendChild(div("button",Div.text("load"),Div.event("click",(e)=>{
			loadSave(JSON.parse(saveEl.value));
		})));
		wsEl.addEventListener("click",e=>{
			document.activeElement.blur();
			if (!(e.ctrlKey||e.shiftKey)) {
				deselectAllBlocks();
				stopEditingAllBlocks();
			}
		});
		wsEl.addEventListener("pointerdown",e=>{
			e.preventDefault();
			clearSelection();
			function clearSelection() {
				if (window.getSelection) {window.getSelection().removeAllRanges();}
				else if (document.selection) {document.selection.empty();}
			}
		});
		wsEl.addEventListener("pointerup",e=>{
			if (!(e.ctrlKey||e.shiftKey)) deselectAllNodes();
			e.preventDefault();
		});
		document.addEventListener("keydown",e=>{
			console.log(e);
			if (e.ctrlKey && e.key=="Delete") {
				[...selectedBlocks].forEach(destroyBlock);
			}
		});
		updateWSSize();
	}
	main();
	return wsEl;
}


let wsEl = workspace();
wsEl.style.minWidth = "100vw";
wsEl.style.minHeight = "100vh";
document.body.appendChild(wsEl);



function fitChildrenSize(el) {
	el.style.height = Math.max(...[...el.children].map(c=>c.offsetTop+c.offsetHeight))+"px";
	el.style.width = Math.max(...[...el.children].map(c=>c.offsetLeft+c.offsetWidth))+"px";
}


function sif (cond, thing, e) {
	if (cond) return [thing];
	else {
		if (typeof e == "undefined") return [];
		else return e;
	}
}
function ssif (cond, things, e=[]) {
	if (cond) return things;
	else return e;
}


function findParent(el,test_callback) {
	while (el!=null && !test_callback(el))
		el = el.parentElement;
	return el;
}
Array.prototype.remove = function (item) {
	if (this.indexOf(item)!=-1)
		this.splice(this.indexOf(item),1);
}

function emptyEl(el) {
	while (el.firstChild) {
		el.removeChild(el.firstChild);
	}
}

