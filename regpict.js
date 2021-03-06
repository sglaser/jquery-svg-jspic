/**
 * 
 */
function regpict() {
	var defaultWidth = 32;
	var defaultUnused = "RsvdP";
	var cellWidth = 16;
	var cellHeight = 32;
	var cellInternalHeight = 8;
	var cellTop = 16;
	var log_ul = $("#log");
	var validAttr = /^(rw|ro|rw1c|hwinit|ros|rws|rw1cs|rsvp|rsvz)$/i;
	
	function remove_all_regpict() {
		$("div.regpict").remove();
	}
	function add_all_regpict() {
		$("div.register").each(add_regpict);
	}
	function replace_all_regpict() {
		remove_all_regpict();
		add_all_regpict();
	}
	function add_regpict() {
		var width = (this.dataset && this.dataset.width) || defaultWidth;
		var unused = (this.dataset && this.dataset.unused) || defaultUnused;
		var fields = [ ];

		$("table tbody", this).first().children().each(function() {
			var td = $(this).children();
			if (td.length >= 3) {
				var bits = td.eq(0).text();
				var desc = td.eq(1);
				var attr = td.eq(2).text().toLowerCase();
				var lsb, msb, match;
				if ((match = /^(\d+):(\d+)$/.exec(bits)) != null) {
					msb = +match[1];
					lsb = +match[2];
					if (lsb > msb) {
						msb = +match[2];
						lsb = +match[1];
					}
				} else if ((match = /^(\d+)$/.exec(bits)) != null) {
					msb = lsb = +match[1];
				} else {
					msb = lsb = -1;
				}
				var fieldName = $("code:first", desc);
				if (fieldName.length == 0) {
					fieldName = /^\s*(\w+)/.exec(desc.text())[1];
				} else {
					fieldName = fieldName.first().text();
				}
				if (! validAttr.test(attr)) {
					attr = "other"; 
				}
				fields.push({
					"msb"  : msb,
					"lsb"  : lsb,
					"name" : fieldName,
					"attr" : attr,
					"unused": false});
			}
		});
		var bitarray = [];
		bitarray[width] = 1000;
		for (var i = 0; i < width; i++) {
			bitarray[i] = -1;
		}
		fields.forEach(function(item, index){
			for (var i = item.lsb; i <= item.msb; i++) {
				bitarray[i] = index;
			}
		});
		var lsb = -1;
		for (var i = 0; i <= width; ++i) {
			if (lsb >= 0 && bitarray[i] >= 0) {
				fields.push({
					"msb" : i - 1,
					"lsb" : lsb,
					"name" : ((i-lsb)*2-1) >= unused.length ? unused : "R",
					"attr" : unused.toLowerCase(),
					"unused": true});
				lsb = -1;
			}
			if (lsb < 0 && bitarray[i] < 0) {
				lsb = i;
			}
		}
		$(this).data("regpict",{"fields": fields});
		var svgdiv_string = "<div class='regpict'/>";
		$(this).prepend(svgdiv_string);
		$("div.regpict", this).svg(draw_regpict);
	}
	function draw_regpict(svg) {
		var fields = $(this).parent().data("regpict").fields;
		var width = 0;
		for (var i = 0; i < fields.length; i++) {
			var msb = fields[i].msb+1;
			width = width <= msb ? msb : width;
		}
		function leftOf(i)   { return cellWidth*(width-i-0.5); }
		function rightOf(i)  { return cellWidth*(width-i+0.5); }
		function middleOf(i) { return cellWidth*(width-i); }
		var g = svg.group();
		var p = svg.createPath();
		for (var i = 0; i < fields.length; i++) {
			var f = fields[i];
			var text = svg.text(g,middleOf(f.lsb),cellTop-4,
					svg.createText().string(f.lsb),
					{class_: "regBitNum"});
			if (f.lsb != f.msb) {
				svg.text(g,middleOf(f.msb),cellTop-4,
						svg.createText().string(f.msb),
						{class_: "regBitNum"});
			}
			p.move(rightOf(f.lsb),cellTop-text.clientHeight).line(0,cellTop,true);
		}
		p.move(rightOf(width),cellTop/3).line(0,cellTop,true);
		var nextBitLine = cellTop+cellHeight+20; //76;
		var bitLineCount = 0;
		svg.path(g,p,{class_: "regBitNumLine"});
		for (var b = 0; b < width; b++) {
			for (var i = 0; i < fields.length; i++) {
				var f = fields[i];
				if (b == f.lsb) {
					g = svg.group();
					svg.rect(g, leftOf(f.msb), cellTop, rightOf(f.lsb)-leftOf(f.msb), cellHeight,
							0,0,{class_: "regFieldBox regFieldBox" + f.attr});
					for (var j = f.lsb+1; j <= f.msb; j++) {
						svg.line(g,
								rightOf(j),cellTop+cellHeight-cellInternalHeight,
								rightOf(j),cellTop+cellHeight,
								{class_: "regFieldBoxInternal" +
										" regFieldBoxInternal" + f.attr});
					}
					var text = svg.text(g,(leftOf(f.msb)+rightOf(f.lsb))/2,32,
								svg.createText().string(f.name),
								{class_: "regFieldName" +
										" regFieldName" + f.attr +
										" regFieldNameInternal" +
										" regFieldNameInternal" + f.attr});
					if ((text.clientWidth + 2 > rightOf(f.lsb)-leftOf(f.msb))
					 || (text.clientHeight + 2 > cellHeight-cellInternalHeight)) {
						svg.change(text,{ x: rightOf(-0.5),
										  y: nextBitLine,
										  class_: "regFieldName" +
										  		 " regFieldName" + f.attr +
										  		 " regFieldName" + (bitLineCount<2 ? "0" : "1")});
						p = svg.createPath();
						p.move(leftOf(f.msb),cellTop+cellHeight)
						 .line((f.msb-f.lsb+1)*cellWidth/2,4,true)
						 .line(rightOf(f.lsb),cellTop+cellHeight)
						 .move((f.lsb-f.msb-1)*cellWidth/2,4,true)
						 .vert(nextBitLine - text.clientHeight/4)
						 .horiz(rightOf(-0.4));
						svg.path(g,p,{class_: "regBitBracket" +
											 " regBitBracket" + (bitLineCount<2 ? "0" : "1")});
						nextBitLine += text.clientHeight+2;
						bitLineCount = (bitLineCount + 1) % 4;
					}
				}
			}
		}
		svg.configure({ height: "" + nextBitLine});
	}
	function log(str) {
		if (str == undefined)
			log_ul.append("<li class='log'>undefined</li>");
		else
			log_ul.append("<li class='log'>" + str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + "</li>");
	}
	$("#replace_regpict").click(replace_all_regpict);
	$("#clear_log").click(function() {log_ul.empty();});
	add_all_regpict();
};

$(function() {
	regpict();
   }); // end ready