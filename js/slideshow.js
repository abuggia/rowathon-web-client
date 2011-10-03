/*  slideshow.js, version 0.3
 *  (c) Copyright 2007 Nathan Herald
 *
 *  slideshow.js is freely distributable under the terms of the GPL 2.0
 *  For details, see the slideshow.js web site: http://code.google.com/p/slideshow-js/
 *
 *------------------------------------------------------------------------------------*/

// this is to add to the existing transitions
Effect.Transitions.slowstop = function(pos) {
  return 1-Math.pow(0.5,20*pos);
}
// end custom transition

// this is an extension to the prototype Element
Element.addMethods({
  wrap: function(element, tag_name) {
    element = $(element);
    var wrapper = document.createElement(tag_name);
    element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return Element.extend(wrapper);
  }
});
// end custom extension


// The primary class
var Slideshow = Class.create();

Slideshow.prototype = {
	version: "0.3",
	duration: 2, // setting
	padding: 10, // setting
	slideshow_size: { width:0, height:0 }, // setting, 0 means I will not change the size
	slideshow_background: "transparent", // setting
	show_nav: true, // setting
	show_descriptions: true, // setting
	nav_code: "", // setting, should be escaped html
	description_template: "#{description}", // setting, use #{number} for the actual image number replacement and #{description} for the actual description text and #{total} for the total number of images in the slideshow
	auto_play: false, // setting
	timer_delay: 5, // setting, in seconds
	auto_size: false, // setting, to size the slideshow viewing window to the largest width and largest height out of all the images
	auto_center: false, // setting, to center all the images inside the li
	auto_resize: true, // setting, automatically takes away 20px from the height of the viewer
	content_is_images: true, // setting
	
	timer_id: 0, // this is to keep track of the id that setInterval returns
	is_playing: false, // boolean test to see if the timer is active
	image_list: {}, // an ImageList class that holds all the info about the images (or li's)
	total: 0, // the total number of images
	the_slide: {}, // an object to save the return of new Effect so that the effect can be cancelled if needed
	current_image: 0, // the interger index in the images_array of the current image being shows
	element_id: "", // the id of the div that is passed during initialization
	proxy_pos: 0, // the intiger index of the Slideshows.list array that this slideshow class is stored at, this is used so that this class can find itself without knowing what variable it was stored in
	proxy_string: "", // this is a concatenation of of text that can be used to directly access this particular class object from the outside, it looks like Slideshows.list[0]
	ul_id: "", // the id of the ul inside of the div
	auto_size_dimensions: { width:0, height:0 }, // contains the dimensions of the largest width and height of all the images in the slideshow
	initialize: function(element) {
		this.proxy_pos = Slideshows.push(this); // add this class to the proxy object Slideshows and record the interger index
		this.proxy_string = "Slideshows.list["+this.proxy_pos+"]"; // a string that can be evaled to get to this class from the outside
		this.element_id = element; // the id of the div (sent as an argument to this function)
		
		this.setup(element); // run setup, 2 lines down
	},
	setup: function(element) {
		$(element).setStyle({ overflow:'hidden'}); // set it to hidden now, cause if you wait until create, it still shows a scrollbar in safari... they seem to have fixed this in the newest nightly webkit, but this works for now
		this.ul_id = $$('#'+element+' ul')[0].id; // record the id of the ul inside the div, the ul has it's left position changed to facilitate the slide
	},
	create: function() {		
		this.image_list = this.generate_image_list(this.element_id); // his records the widths and alts of all the images
		
		this.description_template = new Template(this.description_template); // save over the text with a template object using that text, this facilitates the substituion of #{number} with the actual number, i love this thing
		
		this.resize(this.element_id); // run resize, which hacks 20px off the height
		
		this.set_nav_code(); // this inserts the nav code if this.show_nav is true
		
		this.mark_and_update(0); // this updates the description and will eventually mark the current image number (or thumbnail) different than the rest
		
		if ( this.auto_play ) { this.start(); }
	},
	next: function() {		
		if ( this.current_image == this.image_list.alts.length-1 ){
			this.slide(0); // perform the slide back to the beginning, cause we are at the end
		} else {
			this.slide(this.current_image+1); // just slide to the next image index
		}
	},
	previous: function() {
		if ( this.current_image == 0 ) {
			this.slide(this.image_list.alts.length-1); 
		} else {
			this.slide(this.current_image-1); // just slide to the previous image index
		}
	},
	slide: function(number) {
		if ( this.current_image == number ) { return false; } // if you are already on that image, return out of this
		
		if ( this.the_slide.currentFrame ) { this.the_slide.cancel(); } // if a slide is in progress, cancel it so we can start over
		
		distance = this.get_distance(number); // see how far we have to go
		
		this.current_image = number; // save the new current image number
		
		this.the_slide = new Effect.MoveBy(this.ul_id, 0, distance, { duration: this.duration, transition: Effect.Transitions.slowstop }); // run this effect to do the slide
		
		return this.mark_and_update(number); // returns the same number you give it
	},
	mark_and_update: function(number) {
		if ( this.show_descriptions && this.show_nav ) {			
			$('slideshow-description-'+this.proxy_pos).update(this.description_template.evaluate({ number:number+1, description:this.image_list.alts[number], total:this.total, width:this.image_list.widths[number], height:this.image_list.heights[number], filename:this.image_list.filenames[number] }));
			// I know, this is crazy looking
			// What happens is that the description is given a unique id eariler, so you can find it
			// it is updated using the description_template which current makes number, description, and total available
			// number is number+1 because array indexes start at 0
		}
		return number; // send back the number they gave you
	},
	resize: function(element) {
		if ( this.slideshow_size.height != 0 ) { $(element).setStyle({ height:this.slideshow_size.height }); }
		
		if ( this.slideshow_size.width != 0 ) { $(element).setStyle({ width:this.slideshow_size.width }); }
		
		if ( this.slideshow_size.height == 0 && this.auto_resize ) { 
			new_height = $(element).getHeight() - 20 + 'px';
			$(element).setStyle({ height:new_height });
		}
		
		if ( this.auto_size ) { 
			$(element).setStyle({ width:this.auto_size_dimensions.width+'px', height:this.auto_size_dimensions.height+'px' });
		}
		
		if ( this.slideshow_background != "transparent" ) {
			$(element).setStyle({ background:this.slideshow_background })
		}
	},
	generate_image_list: function(element) {
		// set some defaults
		positions_array = [0];
		alts_array = [];
		widths_array = [];
		heights_array = [];
		filenames_array = [];
		current_position = 0;
		padding = this.padding; 
		
		big_w = 0; // this will record the largest width found in all the images
		big_h = 0; // this will record the largest height found in the all the images
		
		images = $$('#'+element+' img'); // find all images in element	
		
		// loop through them and save their widths and descriptions
		images.each(function(e) {
			dims = e.getDimensions();
			width = dims.width;
			height = dims.height;
			// make a new current position by increasing the old one by the next image plus some padding
			filename = e.src.split('/'); // this sets filename to an array of strings
			filename = filename[filename.length-1]; // this only keeps the last string, which should be the filename
			
			current_position += width + padding;
			
			if ( width > big_w ) { big_w = width; }
			if ( height > big_h ) { big_h = height; }
			
			// save the width
			positions_array.push(-current_position);
			alts_array.push(e.alt);
			widths_array.push(width);
			heights_array.push(height);
			filenames_array.push(filename);
		}); // end of images.each
		
		/* I don't want to do two $$ loops, but I cannot thing of a way around it for this case */
		if ( this.auto_center ) {
			
			positions_array = [0];
			current_position = 0;
			
			images.each(function(e) {
				half_height = Math.floor( ( big_h - e.getDimensions().height ) / 2 ) + 'px';
				e.up('li').setStyle({ width:big_w+'px', "text-align":'center', display:'block' });
				// e.setStyle({ position:'relative', top:half_height });
				e.setStyle({ 'margin-top':half_height, 'margin-bottom':half_height });
				current_position += big_w + padding;
				positions_array.push(-current_position);
			}); // end of images.each - for the second time
			
		}
		
		/*
		Eventually, I need to allow the use of the li's dimensions instead of just the image, to allow for different kinds of content
		*/
		
		this.total = alts_array.length;
		
		this.auto_size_dimensions.width = big_w;
		this.auto_size_dimensions.height = big_h;
		
		return new ImageList(positions_array, alts_array, widths_array, heights_array, filenames_array);;
	}, // end of generate_project_image_array
	get_distance: function(number) {
		target_position = this.image_list.positions[number];
		current_position = $(this.ul_id).getStyle('left').split('px')[0];
		distance = target_position - current_position;
		
		return distance;
	},
	start: function() {
		this.timer_id = setInterval(this.proxy_string+".next()", this.timer_delay*1000); // returns an integer
		if ( this.show_nav && this.auto_play ) {
			$('slideshow-play-stop-'+this.proxy_pos).removeClassName('slideshow-play-only');
			$('slideshow-play-stop-'+this.proxy_pos).addClassName('slideshow-stop-only');
		}
		this.is_playing = true;
	},
	stop: function() {
		clearInterval(this.timer_id); // uses the stored integer to stop the thing
		if ( this.show_nav && this.auto_play ) {
			$('slideshow-play-stop-'+this.proxy_pos).addClassName('slideshow-play-only');
			$('slideshow-play-stop-'+this.proxy_pos).removeClassName('slideshow-stop-only');
		}
		this.is_playing = false;
	},
	toggle: function() {
		if ( this.is_playing ) {
			this.stop();
		} else {
			this.start();
		}
	},
	next_and_stop: function() {
		this.stop();
		this.next();
	},
	previous_and_stop: function() {
		this.stop();
		this.previous();
	},
	set_nav_code: function() {
		if ( this.nav_code == "" && this.show_nav ) {
			if ( this.auto_size ) {
				// I conside this kludgy code, but I am too lazy to improve it right now
				this.nav_code = "<div class=\"slideshow-nav\" style=\"width:"+this.auto_size_dimensions.width+"px\">";
			} else {
				this.nav_code = "<div class=\"slideshow-nav\">";
			}
			
			if ( this.show_descriptions ) {
				this.nav_code += "<div class=\"slideshow-description\" id=\"slideshow-description-"+this.proxy_pos+"\"></div>";
			}
			
			if ( this.auto_play ) {
				this.nav_code += "<div class=\"slideshow-play-stop\" id=\"slideshow-play-stop-"+this.proxy_pos+"\"><a href=\"#\" class=\"slideshow-stop\" onclick=\""+this.proxy_string+".stop(); return false\">Stop</a><a href=\"#\" class=\"slideshow-play\" onclick=\""+this.proxy_string+".start(); return false\">Play</a></div>"
			}
			
			this.nav_code += "<div class=\"slideshow-next-prev\"><a href=\"#\" class=\"slideshow-prev\" onclick=\""+this.proxy_string+".previous_and_stop(); return false\">Previous</a><a href=\"#\" class=\"slideshow-next\" onclick=\""+this.proxy_string+".next_and_stop(); return false\">Next</a></div></div>";
			
			new Insertion.After(this.element_id, this.nav_code); // inserts the nav right after the element div, but not inside the div
		}
	}
}

var ImageList = Class.create();

ImageList.prototype = {
	widths: [],
	heights: [],
	positions: [],
	alts: [],
	filenames: [],
	initialize: function(positions, alts, widths, heights, filenames) {
		this.positions = positions;
		this.alts = alts;
		this.widths = widths;
		this.heights = heights;
		this.filenames = filenames;
	}
}


// This is a proxy object to keep track of multiple slideshows so the slideshow navigation can find it's particular slideshow
var Slideshows = {}

Slideshows = {
	list: [],
	push: function(slideshow) {
		current_pos = Slideshows.list.length
		Slideshows.list.push(slideshow);
		return current_pos;
	}
}
