define('lwidgets/ColorPaletteIrc',[
	"require", // require.toUrl
	//"dojo/text!dijit/templates/ColorPalette.html",
	"dijit/_Widget", // used also to load dijit/hccss for setting has("highcontrast")
	"dijit/_TemplatedMixin",
	"dijit/_PaletteMixin",
	"dijit/hccss", // has("highcontrast")
	"dojo/i18n", // i18n.getLocalization
	"dojo/_base/Color", // dojo.Color dojo.Color.named
	"dojo/_base/declare", // declare
	"dojo/dom-construct", // domConstruct.place
	"dojo/string", // string.substitute
	
	"dijit/ColorPalette",
	
	"dojo/i18n!dojo/nls/colors", // translations
	"dojo/colors",    // extend dojo.Color w/names of other colors
	

], function(
			require,
			//template,
			_Widget, _TemplatedMixin, _PaletteMixin, has, i18n, Color,
			declare, domConstruct, string,
	
			ColorPalette
	){

	// module:
	//		dijit/ColorPalette

	//var ColorPaletteIrc = declare([ColorPalette], {
	var ColorPaletteIrc = declare([_Widget, _TemplatedMixin, _PaletteMixin], {
		// summary:
		//		A keyboard accessible color-picking widget
		// description:
		//		Grid showing various colors, so the user can pick a certain color.
		//		Can be used standalone, or as a popup.
		//
		// example:
		// |	<div data-dojo-type="dijit/ColorPalette"></div>
		//
		// example:
		// |	var picker = new dijit.ColorPalette({ },srcNode);
		// |	picker.startup();


		// palette: [const] String
		//		Size of grid, either "7x10" or "3x4".
		palette: "7x10",

		// _palettes: [protected] Map
		//		This represents the value of the colors.
		//		The first level is a hashmap of the different palettes available.
		//		The next two dimensions represent the columns and rows of colors.
		_palettes: {
			"7x10": [
				["white", "seashell", "cornsilk", "lemonchiffon", "lightyellow", "palegreen", "paleturquoise", "lightcyan", "lavender", "plum"],
				["lightgray", "pink", "bisque", "moccasin", "khaki", "lightgreen", "lightseagreen", "lightskyblue", "cornflowerblue", "violet"],
				["silver", "lightcoral", "sandybrown", "orange", "palegoldenrod", "chartreuse", "mediumturquoise", "skyblue", "mediumslateblue", "orchid"],
				["gray", "red", "orangered", "darkorange", "yellow", "limegreen", "darkseagreen", "royalblue", "slateblue", "mediumorchid"],
				["dimgray", "crimson", "chocolate", "coral", "gold", "forestgreen", "seagreen", "blue", "blueviolet", "darkorchid"],
				["darkslategray", "firebrick", "saddlebrown", "sienna", "olive", "green", "darkcyan", "mediumblue", "darkslateblue", "darkmagenta" ],
				["black", "darkred", "maroon", "brown", "darkolivegreen", "darkgreen", "midnightblue", "navy", "indigo", "purple"]
			],

			"3x4": [
				["white", "lime", "green", "blue"],
				["silver", "yellow", "fuchsia", "navy"],
				["gray", "red", "purple", "black"]
			],
			
			"4x4": [
				["white", "lime", "green", "blue"],
				["silver", "yellow", "fuchsia", "navy"],
				["gray", "red", "purple", "black"],
				["brown", "orange", "teal", "lightcyan"],
			],
			
		},

		// templateString: String
		//		The template of this widget.
		//templateString: template,
		templateString: '<div class="dijitInline dijitColorPalette" role="grid">'
			+'<table data-dojo-attach-point="paletteTableNode" class="dijitPaletteTable" cellSpacing="0" cellPadding="0" role="presentation">'
				+'<tbody data-dojo-attach-point="gridNode"></tbody>'
			+'</table> </div>',

		baseClass: "dijitColorPalette",

		_dyeFactory: function(value, row, col, title){
			// Overrides _PaletteMixin._dyeFactory().
			return new this._dyeClass(value, row, col, title);
		},

		buildRendering: function(){
			// Instantiate the template, which makes a skeleton into which we'll insert a bunch of
			// <img> nodes
			this.inherited(arguments);

			//	Creates customized constructor for dye class (color of a single cell) for
			//	specified palette and high-contrast vs. normal mode.   Used in _getDye().
			//this._dyeClass = declare(ColorPalette._Color, {
			this._dyeClass = declare(ColorPaletteIrc._Color, {
				palette: this.palette
			});

			// Creates <img> nodes in each cell of the template.
			this._preparePalette(
				this._palettes[this.palette],
				i18n.getLocalization("dojo", "colors", this.lang));
		}
	});

	//ColorPalette._Color = declare("dijit._Color", Color, {
	ColorPaletteIrc._Color = declare("lwidgets._Color", Color, {
		// summary:
		//		Object associated with each cell in a ColorPalette palette.
		//		Implements dijit/Dye.

		// Template for each cell in normal (non-high-contrast mode).  Each cell contains a wrapper
		// node for showing the border (called dijitPaletteImg for back-compat), and dijitColorPaletteSwatch
		// for showing the color.
		template: "<span class='dijitInline dijitPaletteImg'>" +
			"<img src='${blankGif}' alt='${alt}' title='${title}' class='dijitColorPaletteSwatch' style='background-color: ${color}'/>" +
			"</span>",

		// Template for each cell in high contrast mode.  Each cell contains an image with the whole palette,
		// but scrolled and clipped to show the correct color only
		hcTemplate: "<span class='dijitInline dijitPaletteImg' style='position: relative; overflow: hidden; height: 12px; width: 14px;'>" +
			"<img src='${image}' alt='${alt}' title='${title}' style='position: absolute; left: ${left}px; top: ${top}px; ${size}'/>" +
			"</span>",

		// _imagePaths: [protected] Map
		//		This is stores the path to the palette images used for high-contrast mode display
		_imagePaths: {
			"7x10": require.toUrl("./themes/a11y/colors7x10.png"),
			"3x4": require.toUrl("./themes/a11y/colors3x4.png"),
			"4x4": require.toUrl("./themes/a11y/colors3x4.png"),
			//"4x4": require.toUrl("../img/colors4x4.png"), //doesn't seem to make a difference
		},

		constructor: function(alias, row, col, title){
			// summary:
			//		Constructor for ColorPalette._Color
			// alias: String
			//		English name of the color.
			// row: Number
			//		Vertical position in grid.
			// column: Number
			//		Horizontal position in grid.
			// title: String
			//		Localized name of the color.
			this._title = title;
			this._row = row;
			this._col = col;
			this.setColor(Color.named[alias]);
		},

		getValue: function(){
			// summary:
			//		Note that although dijit._Color is initialized with a value like "white" getValue() always
			//		returns a hex value
			return this.toHex();
		},

		fillCell: function(/*DOMNode*/ cell, /*String*/ blankGif){
			    //doesn't seem to make a difference
				var size = (this.palette == "7x10") ? "height: 145px; width: 206px" : "height: 64px; width: 86px";
				if (this.palette == "4x4" ) {
					size = "height: 186px; width: 86px";
				}
				
			var html = string.substitute(has("highcontrast") ? this.hcTemplate : this.template, {
				// substitution variables for normal mode
				color: this.toHex(),
				blankGif: blankGif,
				alt: this._title,
				title: this._title,

				// variables used for high contrast mode
				image: this._imagePaths[this.palette].toString(),
				left: this._col * -20 - 5,
				top: this._row * -20 - 5,
				size: size,
			});

			domConstruct.place(html, cell);
		}
	});

	return ColorPaletteIrc;
});