(function ($, document) {
    var jqi18n = {
        projectName: "Ultra light i18n Engine",
        version: "1.2.0",
        githubUrl: "https://github.com/Javenper/lingua-i18n",
        defaultOptions: {
            // Default locale based on browser language
            locale: navigator.language || navigator.userLanguage,
            // Store translations for different locales
            dictionaries: {},
            // Store path of url service for load the dictionaries
            path: "/Translation/"
        },
        settings: {},
        init: function (options) {
            // Override default options de forma segura sin mutar defaultOptions
            this.settings = $.extend({}, this.defaultOptions, options);
        },
        setLocale: function (locale) {
            var self = this;
            if (locale != self.settings.locale) {
                if (self.settings.dictionaries && self.settings.dictionaries.hasOwnProperty(locale)) {
                    self.settings.locale = locale;
                    self.translateDOM();
                } else {
                    // Switch to a new language
                    self.loadDictionary(locale)
                        .then(function (dictionary) {
                            // Update the current language
                            self.settings.locale = locale;
                            self.settings.dictionaries[locale] = dictionary;
                            self.translateDOM();
                        })
                        .catch(function (error) {
                            console.error("Error loading locale: " + locale, error);
                        });
                }
            }
        },
        loadDictionary: function (lang) {
            var url = `${this.settings.path}${lang}`;
            // Return the promise of loading the JSON file
            return _loadJSON(url);
        },
        setDictionary: function (dictionary, language) {
            if (!this.settings || !this.settings.dictionaries) {
                this.init();
            }
            this.settings.locale = language;
            this.settings.dictionaries[language] = dictionary;
            this.translateDOM();
        },
        translate: function (key) {
            var locale = this.settings.locale;
            var translations = this.settings.dictionaries[locale];

            if (!translations) return key;

            try {
                if (key.includes(".")) {
                    var keys = key.split(".");
                    if (translations.hasOwnProperty(keys[0]) &&
                        translations[keys[0]].hasOwnProperty(keys[1])) {
                        return translations[keys[0]][keys[1]];
                    }
                }
                else if (key in translations) {
                    return translations[key];
                }
            }
            catch (err) {
                console.error("Translation error for key: " + key, err);
            }
            return key; // Return original key if translation not found
        },
        translateOptions: function (key, options) {
            var optionsArray = Array.isArray(options) ? options : [options];
            var translation = this.translate(key);

            if (!translation) return key;

            for (var option of optionsArray) {
                if (option.context) {
                    var contextKey = key + "_" + option.context;
                    translation = this.translate(contextKey);
                }
                if (typeof option.count !== "undefined" && option.count !== null) {
                    var suffix = option.count === 1 ? "_one" : "_other";
                    translation = this.translate(key + suffix);
                    translation = translation.replace("{{count}}", option.count);
                }
                if (option.name) {
                    translation = translation.replace("{{name}}", option.name);
                }
                if (option.var !== undefined && option.var !== null && option.var.length !== 0) {
                    translation = translation.replace("{{var}}", option.var);
                }
            }
            return translation;
        },
        translateCompounds: function (tkey, sentence) {
            var translation = sentence;
            var matches = sentence.match(/{{(.*?)}}/g);
            if (!matches) return translation;

            for (var match of matches) {
                var temp = match.slice(2, -2);
                var parts = temp.split(":");
                var key = parts[0].replace(/\s+/g, '');
                var value = parts[1] ? parts[1].replace(/\s+/g, '') : '';

                switch (key) {
                    case "name":
                        translation = translation.replace(match, value);
                        break;
                    case "count":
                        var suffix = value === "1" ? "_one" : "_other";
                        var countTranslation = this.translate(tkey + suffix);
                        translation = translation.replace(match, countTranslation);
                        break;
                    case "context":
                        var contextTranslation = this.translate(tkey + "_" + value);
                        translation = translation.replace(match, contextTranslation);
                        break;
                    case "var":
                        translation = translation.replace(match, value);
                        break;
                }
            }
            return translation;
        },
        translateDOM: function () {
            var self = this;
            $('[data-i18n]').each(function () {
                const key = $(this).attr('data-i18n');
                self.translateElement(this, key);
            });
            $('[data-attr-i18n]').each(function () {
                self.translateAttributes(this);
            });
        },
        translateElement: function (element, key) {
            var $element = $(element);
            var translation = key;

            if ($element.attr('i18n-options') !== undefined) {
                try {
                    var options = JSON.parse($element.attr('i18n-options'));
                    translation = this.translateOptions(key, options);
                } catch (e) {
                    console.error("Invalid JSON in i18n-options for key: " + key, e);
                    translation = this.translate(key);
                }
            } else {
                translation = this.translate(key);
            }

            if ($element.is(':input[type=button], :input[type=submit], :input[type=reset], :button')) {
                if ($element.is(':input[type=submit]')) {
                    $element.prop('value', translation);
                } else {
                    $element.text(translation);
                }
            }
            else if ($element.is('input[type=text], input[type=textarea], input[type=password], textarea')) {
                $element.attr('placeholder', translation);
            }
            else if ($element.is('select')) {
                // Comportamiento personalizado para select si es necesario, o placeholder
                $element.attr('placeholder', translation);
            }
            else {
                $element.html(translation); // Cambiado a .html por si tus traducciones llevan negritas o tags sencillos
            }
        },
        translateAttributes: function (element) {
            var $element = $(element);
            var attributesList = $element.data('attr-i18n');

            // Si viene como string stringificado por HTML, lo parseamos de manera segura
            if (typeof attributesList === "string") {
                try { attributesList = JSON.parse(attributesList); } catch (e) { return; }
            }

            if (!Array.isArray(attributesList)) return;

            for (const attribute of attributesList) {
                var translation = this.translate(attribute.key);
                if (attribute.name === "tooltip") {
                    $element.prop('title', translation);
                    if (typeof $element.tooltip === 'function') {
                        $element.tooltip('dispose');
                        $element.tooltip();
                    }
                } else {
                    $element.prop(attribute.name, translation);
                }
            }
        },
        getLanguage: function () {
            return this.settings.locale;
        }
    };

    var _loadJSON = function (url) {
        return new Promise(function (resolve, reject) {
            $.getJSON(url, function (data) {
                resolve(data);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                reject(new Error("Failed to load " + url + " (" + textStatus + ")"));
            });
        });
    };

    $.jqi18n = jqi18n;

})(jQuery, document);
