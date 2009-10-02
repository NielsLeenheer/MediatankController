/*
 * Based on Sweet Titles by Dustin Diaz.
 */

ProtoTip = Class.create({		
	initialize: function() {
	    this.xCord = 0;
	    this.yCord = 0;
	    this.obj = null;
	    this.tooltipTagNames = ["a", "acronym", "abbr"];

        Event.observe(document, "mousemove", this.updateXY.bind(this), false);
		
        for (var i = 0, tagName; tagName = this.tooltipTagNames[i]; i++)
        {
            var elements = document.getElementsByTagName(tagName);
            for (var j = 0, element; element = elements[j]; j++)
            {
                if (!element.getAttribute("tip")) // Safely allow multiple calls
                {
					if (element.title) {
						Event.observe(element, "mouseover", this.tipOver.bind(this), false);
						Event.observe(element, "mouseout", this.tipOut.bind(this), false);
						element.setAttribute("tip", element.title);
						element.removeAttribute("title");
					}
                }
            }
        }
    },

    updateXY: function(e)
    {
        this.xCord = Event.pointerX(e);
        this.yCord = Event.pointerY(e);
    },

    tipOut: function(e)
    {
        if (this.tID)
        {
            window.clearTimeout(this.tID);
        }

        var div = $("toolTip");
        if (div != null)
        {
            div.parentNode.removeChild(div);
        }
    },

    checkNode: function(obj)
    {
        for (var i = 0, tagName; tagName = this.tooltipTagNames[i]; i++)
        {
            if (obj.nodeName.toLowerCase() == tagName)
            {
                return obj;
            }
        }
        return obj.parentNode;
    },

    tipOver: function(e)
    {
        this.obj = Event.element(e);
        this.tID = window.setTimeout(this.tipShow.bind(this), 2000)
    },

    tipShow: function()
    {
        var element = this.checkNode(this.obj);
        var extraInfo = "";
        var accessKey = "";
        if (element.nodeName.toLowerCase() == "a")
        {
           // extraInfo = (element.href.length > 25 ? element.href.toString().substring(0,25) + "..." : element.href);
            accessKey = (element.accessKey ? " <span>[" + element.accessKey + "]</span> " : "");
        }
        else
        {
            extraInfo = element.firstChild.nodeValue;
        }

        var tooltip = document.createElement("div");
        tooltip.id = "toolTip";
        document.body.appendChild(tooltip);
        tooltip.innerHTML = "<p>" + element.getAttribute("tip") + "<em>" + accessKey + extraInfo + "</em></p>";

        var top = this.yCord + 15;
        var left = this.xCord + 5;

        // Prevent horizontal hiding
        if (this.willOverflowHorizontal(tooltip.offsetWidth + left))
        {
            tooltip.style.right = "20px";
        }
        else
        {
            tooltip.style.left = left + "px";
        }

        // Prevent vertical hiding
        if (this.willOverflowVertical(tooltip.offsetHeight + top))
        {
            tooltip.style.top = (this.yCord - tooltip.offsetHeight - 10) + "px";
        }
        else
        {
            tooltip.style.top = top + "px";
        }

      /*  tooltip.style.opacity = ".1";
        tooltip.style.filter = "alpha(opacity:10)";
        this.tipFade("toolTip", 10);*/
    },

    willOverflowHorizontal: function(tooltipRight)
    {
        var x;
        if (self.innerHeight) // all except Explorer
        {
            x = self.innerWidth;
        }
        else if (document.documentElement && document.documentElement.clientHeight)
            // Explorer 6 Strict
        {
            x = document.documentElement.clientWidth;
        }
        else if (document.body) // other Explorers
        {
            x = document.body.clientWidth;
        }

        var scrollX;
        if (self.pageYOffset) // all except Explorer
        {
            scrollX = self.pageXOffset;
        }
        else if (document.documentElement && document.documentElement.scrollTop)
            // Explorer 6 Strict
        {
            scrollX = document.documentElement.scrollLeft;
        }
        else if (document.body) // all other Explorers
        {
            scrollX = document.body.scrollLeft;
        }

        return (tooltipRight > x + scrollX);
    },

    willOverflowVertical: function(tooltipBottom)
    {
        var y;
        if (self.innerHeight) // all except Explorer
        {
            y = self.innerHeight;
        }
        else if (document.documentElement && document.documentElement.clientHeight)
            // Explorer 6 Strict Mode
        {
            y = document.documentElement.clientHeight;
        }
        else if (document.body) // other Explorers
        {
            y = document.body.clientHeight;
        }

        var scrollY;
        if (self.pageYOffset) // all except Explorer
        {
            scrollY = self.pageYOffset;
        }
        else if (document.documentElement && document.documentElement.scrollTop)
            // Explorer 6 Strict
        {
            scrollY = document.documentElement.scrollTop;
        }
        else if (document.body) // all other Explorers
        {
            scrollY = document.body.scrollTop;
        }

        return (tooltipBottom > y + scrollY);
    },

/*
    tipFade: function(element, opac)
    {
			
			
        var tooltip = $(element);
        var newOpacity = opac + 10;
        if (newOpacity <= 90)
        {
            tooltip.style.opacity = "." + newOpacity;
            tooltip.style.filter = "alpha(opacity:" + newOpacity + ")";
            this.opacityID = window.setTimeout(this.tipFade.bind(this, element, newOpacity), 20);
        }
        else
        {
            tooltip.style.opacity = "0.99999";
            tooltip.style.filter = "alpha(opacity:99.99)";
        }
    }
    */
});

Event.observe(window, "load", function() {
	new ProtoTip();
});