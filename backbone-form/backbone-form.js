/*
 * Backbone-Form - Backbone form validator and ajax helper.
 *
 * This is a simple backbone form view for form validation
 * and ajax submit helper.
 *
 * Well integrated with django forms and django-superview
 * json output of form errors.
 *
 * Changelog:
 *  * 21-05-2012 - First public version. (0.1)
 *  * 22-05-2012 - Add global errors. (0.2)
 *               - Add higlight field.
 *  * 28-05-2012 - Add ie fixes. (0.3)
 *               - Add ie ajax upload files. (very experimental)
 *  * 24-06-2012 - Remove client validation. (0.4)
 *               - Add envents
 *               - Code improvements.
 *               - Add Kaleidos namespace.
 *  * 17-08-2012 - Now uses jquery .fail and .done methods.
 *
 *
 * Author: Andrei Antoukh <andrei.antoukh@kaleidos.net>
 * License: BSD
 * Version: 0.4
*/

if (window.gettext === undefined) {
    window.gettext = function(data) { return data; }
}

/* Create namespace if not exists */
if (window.Kaleidos === undefined) {
    window.Kaleidos = {};
}

if (window.getCookie === undefined) {
    window.getCookie = function(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };
}

Kaleidos.Form = Backbone.View.extend({
    defaults: {
        'resetOnInit': false,
        'clearOnInit': false,
        'fieldErrorsOnGlobalBox': false,
        'higlight': 'error-field'
    },

    /* CONSTRUCTOR
     *
     * This method by default need one parameter: `el`.
     * Additionally, you can pass all that defined on defaults dict. */

    initialize: function() {
        _.bindAll(this);

        var options = _.extend({}, this.defaults, this.options);
        this.options = options;

        if (options.clearOnInit) {
            this.clear();
        }

        if (options.resetOnInit) {
            this.reset();
        }

        this.globalErrorsBox = null;
        this.trigger('initialize', this);

        if (this.onInitialize !== undefined) {
            this.onInitialize();
        }
    },

    /*
     * Remove all errors on form.
    */

    clear: function() {
        this.$("ul.errorlist").remove();

        if (this.globalErrorsBox) {
            this.globalErrorsBox.html("");
            this.globalErrorsBox.hide();
        }

        if (this.options.higlight) {
            this.$("." + this.options.higlight).removeClass(this.options.higlight);
        }
        this.trigger('clear', this);
    },

    /*
     * Reset a form. Remove all assigned values.
    */

    reset: function() {
        this.$("input[type=text], input[type=file], select, textarea").val('');
        this.trigger("reset", this);
    },

    /* PRIVATE METHOD
     *
     * creates a custom XMLHttpRequest builder
    */

    getXhr: function() {
        var xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", this.uploadProgress);
        return xhr;
    },

    /* PRIVATE METHOD
     *
     * Calculate a percentage of form upload progress and trigger `progress`
     * event with a current percentaje.
    */

    uploadProgress: function(evt) {
        if (evt.lengthComputable) {
            this.bytesUploaded = evt.loaded;
            this.bytesTotal = evt.total;
            this.trigger('progress', Math.round(evt.loaded * 100 / evt.total));
        }
    },

    ieSubmitFallback: function(opts) {
        var url = opts.url || this.$el.attr('action');
        var type = opts.type || this.$el.attr('method') || 'post';

        var cookie = getCookie('csrftoken');
        if (cookie !== null && cookie.length > 0) {
            if (this.$("[name=csrfmiddlewaretoken]").length > 0) {
                this.$("[name=csrfmiddlewaretoken]").val(getCookie('csrftoken'));
            } else {
                var hiddenCsrf = this.make("input",
                    {"type": "hidden", "name": "csrfmiddlewaretoken", "value": getCookie('csrftoken')});
                this.$el.append(hiddenCsrf);
            }
        }

        // Remove old iframe
        this.$el.parent().find("#upload_iframe").remove();

        // Create new iframe
        var iframe = $('<iframe name="upload_iframe">');
        iframe.attr("id", "upload_iframe");
        iframe.attr("name", "upload_iframe");
        iframe.attr("width", "0");
        iframe.attr("height", "0");
        iframe.attr("border", "0");
        iframe.attr("style", "width: 0; height: 0; border: none;");

        var self = this;
        this.$el.parent().append(iframe);
        this.$el.attr('target', 'upload_iframe');

        var iframeId = document.getElementById("upload_iframe");

        var eventHandler = function () {
            var content = null;
            if (iframeId.detachEvent) iframeId.detachEvent("onload", eventHandler);
            else iframeId.removeEventListener("load", eventHandler, false);

            // Message from server...
            if (iframeId.contentDocument) {
                content = iframeId.contentDocument.body.innerText;
            } else if (iframeId.contentWindow) {
                content = iframeId.contentWindow.document.body.innerText;
            } else if (iframeId.document) {
                content = iframeId.document.body.innerText;
            }

            if (content.length > 0) {
                var data = content;

                if (opts.dataType === "json") {
                    data = JSON.parse(content);
                }

                self.trigger("success", JSON.parse(content));
                if (opts.success !== undefined) {
                    opts.success(data);
                }
            }

            //setTimeout('iframeId.parentNode.removeChild(iframeId)', 250);
            iframeId.parentNode.removeChild(iframeId);
        }

        if (iframeId.addEventListener) iframeId.addEventListener("load", eventHandler, true);
        if (iframeId.attachEvent) iframeId.attachEvent("onload", eventHandler);

        this.el.submit();
    },

    /* submit(opts):  Makes ajax submit of the asociated form
     *
     * Posible params:
     *
     *   `success`:
     *
     *      this is a success callback, receives a response.  If this parameter
     *      is undefined, fallback to use self implemented success method.
     *
     *   `error`
     *
     *      same as `success` but for error.
     *
     *   `dataType`
     *
     *      this is a jquery `dataType` parameter, by default is set to `json`.
     *
     *   `url`
     *
     *      url to send a form data, by default is a form action.
     *
     *   `type`
     *
     *      is a request type, by default, uses form type attribute.
     *
     *   `jqueryOpts`
     *
     *      with this parameter you can pass all jquery parametes ($.ajax()).
    */

    submit: function(opts) {
        this.trigger("pre-submit", this);

        if (this.on_submit_process === true) {
            return;
        }

        this.on_submit_process = true;

        if (opts === undefined) {
            opts = {};
        }

        opts = _.extend({}, this.defaults, this.options, opts);

        if (opts.ignoreFiles === undefined) {
            if (this.options.ignoreFiles !== undefined) {
                opts.ignoreFiles = this.options.ignoreFiles;
            }
        }

        var has_files = false;
        var is_ie = false;

        if (this.$("input[type=file]").length > 0) {
            has_files = true;
        }

        // Check IE
        if (navigator.appVersion.indexOf("MSIE") != -1) {
            is_ie = true;

            if (has_files && !opts.ignoreFiles) {
                return this.ieSubmitFallback(opts);
            }
        }

        var url = opts.url || this.$el.attr('action');
        var type = opts.type || this.$el.attr('method') || 'post';
        var dataType = opts.dataType || 'json';
        var enctype = opts.enctype || this.$el.attr('enctype') || false;
        var jquery_lowlevel_opts = opts.jqueryOpts || {};

        var self = this;

        var ajax_params = {
            url: url,
            type: type,
            dataType: dataType
        };

        if (!is_ie) _.extend(ajax_params, {xhr: this.getXhr});

        if (opts.data !== undefined) {
            ajax_params['data'] = opts.data;
        } else {
            ajax_params['data'] = this.collectData(opts);
        }

        if (enctype && enctype == 'multipart/form-data') {
            ajax_params['processData'] = false;
            ajax_params['contentType'] = false;
        }

        ajax_params = _.extend(ajax_params, jquery_lowlevel_opts);

        var success = function(data, _text, jq) {
            self.trigger("success", data);
            if (opts.success !== undefined) {
                opts.success(data);
            }
        };

        var error = function(jqXHR, textStatus, errorThrown) {
            self.trigger("error", jqXHR, textStatus, errorThrown);
            if (opts.error !== undefined) {
                opts.error(jqXHR, textStatus, errorThrown);
            }
        };

        var jqXHR = $.ajax(ajax_params);
        jqXHR.done(success);
        jqXHR.fail(error);
        jqXHR.complete(function(jq, _status) {
            self.trigger("complete", self, jq, _status);
            self.on_submit_process = false;
        });

        return jqXHR;
    },

    /* collectData(opts)
     *
     * Collects form data. If form has attribute 'enctype' and is equal to 'multipart/form-data'
     * this method return FormData instance. If this interface is not found or is a normal form,
     * this internally use jquery.serialize() method.
     *
     * Options:
     *
     *  `forceSerialize`
     *
     *      with this parameter force user of jquery serialize on case if a form is multipart.
    */

    collectData: function(opts) {
        if (opts === undefined) { opts = {}; }
        opts = _.extend({}, this.defaults, this.options, opts);

        if (opts.forceSerialize === undefined) {
            if (this.options.forceSerialize !== undefined) {
                opt.forceSerialize = this.options.forceSerialize;
            } else {
                opts.forceSerialize = false;
            }
        }

        if (!opts.ignoreFiles) {
            if (this.$el.attr('enctype') === 'multipart/form-data' && !opts.forceSerialize) {
                if (window.FormData !== undefined) {
                    return new FormData(this.el);
                }
            }
        }

        return this.$el.serialize();
    },

    /* PRIVATE METHOD
     *
     * Return all fields on current associated form.
    */

    fields: function() {
        var _fields = new Array();
        _.each(this.$("input, select, textarea"), function(item) {
            _fields.push( $(item) );
        });

        return _fields;
    },

    searchField: function(key) {
        return this.$("[name='" + key + "']");
    },

    setGlobalErrorsBox: function(dom) {
        this.globalErrorsBox = $(dom);
    },

    setErrorsGlobal: function(errors) {
        var self = this;
        _.each(errors.global, function(item) {
            self.globalErrorsBox.append(self.make('li', {}, item));
        });
        this.globalErrorsBox.show();
    },

    setErrorsFieldsStandatd: function(errors) {
        var self = this;

        _.each(errors.form, function(error_list, key) {
            var field = self.searchField(key);
            self.higlight(field);
            var error_list_dom = $(self.make('ul', {'class': 'errorlist', 'id': 'field-' + field.attr('id')}));

            _.each(error_list, function(item) {
                error_list_dom.append(self.make('li', {}, item));
            });

            error_list_dom.insertBefore(field);
        });
    },

    setErrorsFieldsOnGlobalBox: function(errors) {
        var error_list = new Array();
        var self = this;

        _.each(errors.form, function(field_errors, key) {
            var field = self.searchField(key);
            var field_name = field.attr('name');

            self.higlight(field);

            if (errors.fields !== undefined) {
                if (errors.fields[field_name] !== undefined) {
                    field_name = errors.fields[field_name].name;
                }
            }

            _.each(field_errors, function(item) {
                var field_error_string = "<strong>" + field_name + "</strong>: " + item;
                error_list.push(field_error_string);
            });
        });

        this.setErrorsGlobal({global:error_list});
    },

    higlight: function(field) {
        if (this.options.higlight !== undefined){
            field.addClass(this.options.higlight);
        }
    },

    /* setErrors(errors)
     *
     * Draw dinamicaly all errors returned by `render_json_error` from
     * `django-superview`
     *
    */

    setErrors: function(errors) {
        this.clear();
        var self = this;

        if (errors.global && this.globalErrorsBox !== null) {
            this.setErrorsGlobal(errors);
        }

        if (errors.form) {
            if (this.options.fieldErrorsOnGlobalBox) {
                this.setErrorsFieldsOnGlobalBox(errors);
            } else {
                this.setErrorsFieldsStandatd(errors);
            }
        }
    }
});

