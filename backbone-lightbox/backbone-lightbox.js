if (window.Kaleidos === undefined) {
    window.Kaleidos = {};
}

Kaleidos.Lightbox = Backbone.View.extend({
    defaults: {
        width: 600,
        opacity: 0.8,
        background: '#000000',
        lightboxTop: 50,
        overrideTop: false,
        overrideLeft: false,
        valing: true,
        overlay: "#overlay", /* false to disabled */
        forceReload: true,
        fadeIn: false,
        fadeInDuration: 'slow',
        fadeOut: false,
        fadeOutDuration: 'slow',
        source: 'none', /* none, ajax, iframe */
        iframeSource: false,
        iframeWidth: '',
        iframeHeight: '',
        iframeSourceTarget: false,
        ajaxSource: false,
        ajaxSourceTarget: false
    },

    events: {
        'click a.close-lightbox': 'onCloseClicked',
        'click a.accept-lightbox': 'onAcceptClicked'
    },

    initialize: function() {
        _.bindAll(this);
        this.settings = _.extend({}, this.defaults, this.options);

        this.on('open', this.onOpen);
        this.on('close', this.onClose);

        if (this.settings.overlay !== false) {
            this.settings.overlay = $(this.settings.overlay);
        }
        if (this._initialize !== undefined) {
            this._initialize();
        }
        this.trigger('initialize', this);
    },

    onCloseClicked: function(event) {
        event.preventDefault();
        this.close(false);
    },

    onAcceptClicked: function(event) {
        event.preventDefault();
        this.close(true);
    },

    onClose: function() {
        $(document).data('_klightbox', undefined);
    },

    onOpen: function() {
        $(document).data('_klightbox', this);
        if (this.settings.overlay) {
            this.settings.overlay.css({
                'height': $(document).height(),
                'width': $(window).width(),
                'background': this.settings.background,
                'opacity': this.settings.opacity,
                'position': 'absolute'
            });

            var self = this;
            this.settings.overlay.click(function(){
                self.close();
            });
        }

        this.$el.css('z-index', 95);

        if (!this.first_load || this.settings.forceReload){
            if (this.source == 'iframe' && this.settings.iframeSource) {
                var iframe = $(document.createElement('iframe')).attr({
                    'src': this.settings.iframeSource,
                    'width': this.settings.iframeWidth,
                    'height': this.settings.iframeHeight
                });

                if (this.settings.iframeSourceTarget) {
                    this.settings.iframeSourceTarget.html(iframe);
                } else {
                    this.$el.html(iframe);
                }
            }

            this.$el.css({
                'display': 'block',
                'position': 'absolute',
                'width': this.settings.width,
                'visibility': 'hidden'
            });

            var top, left;

            if(this.overrideTop) {
                top = this.settings.overrideTop;
            } else {
                if (this.valing) {
                    var top = ($(document).scrollTop()) + ($(window).height()/2) - (this.$el.outerHeight()/2);
                    if (top < this.settings.lightboxTop) {
                        top = $(document).scrollTop() + this.settings.lightboxTop;
                    }
                } else {
                    top = $(document).scrollTop() + this.settings.lightboxTop;
                }
            }

            if (this.settings.overrideLeft) {
                left = this.settings.overrideLeft;
            }else{
                left = ($(document).width()/2)-(this.settings.width/2);
            }

            this.$el.css({
                'display': 'none',
                'visibility': 'visible',
                'left': left,
                'top': top,
                'z-index': 1002
            });

            this.first_load = true;
        }

        var self = this;

        if (this.settings.fadeIn){
            if (this.settings.overlay) this.settings.overlay.fadeIn(this.settings.fadeInDuration);
            this.$el.fadeIn(this.settings.fadeInDuration, function() {
                self.trigger('load');
            });
        } else {
            if(this.settings.overlay) this.settings.overlay.show();
            this.$el.show();
            this.trigger('load');
        }
    },

    open: function(options) {
        if (this._open !== undefined) {
            this._open(options);
        }

        if (this.settings.source == 'ajax'
                && this.settings.ajaxSource
                && (!this.first_load || this.settings.forceReload)) {

            //this.$("#ajax-loader").css({
            //    'top': ($(document).scrollTop()) + ($(window).height()/2) - (55/2),
            //    'left': ($(document).width()/2)-(54/2),
            //    'display': 'block'
            //});

            this.trigger('ajax-init', this);
            var self = this;

            $.ajax({
                url: this.settings.ajaxSource,
                success: function(data) {
                    if  (self.settings.ajaxSourceTarget){
                        self.settings.ajaxSourceTarget.html(data);
                    } else {
                        self.$el.html(data);
                    }

                    self.trigger('ajax-end', self);
                    self.trigger('open', options);
                }
            });
        } else {
            this.trigger('open', options);
        }
    },

    close: function(ok){
        if (ok === undefined) {
            ok = false;
        }

        if (this.settings.fadeOut) {
            if (this.settings.overlay) {
                this.settings.overlay.fadeOut(this.settings.fadeOutDuration);
            }
            this.$el.fadeOut(this.settings.fadeOutDuration);
        } else {
            if(this.settings.overlay) {
                this.settings.overlay.hide();
            }
            this.$el.hide();
        }

        if (this.settings.overlay) {
            this.settings.overlay.unbind('click');
        }

        if (this._close !== undefined) {
            this._close(ok);
        }
        this.trigger('close', this, ok);
    }
});
