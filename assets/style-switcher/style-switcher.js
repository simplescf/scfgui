var styleSwitcher = $('.u-ss'),
  prefix = styleSwitcher.data('cookies-prefix'),
  preDefStyle = $.cookie(prefix + '.preDefStyle') ? $.cookie(prefix + '.preDefStyle') : 'default';

if (typeof localStorage !== 'undefined') {
  if (localStorage.getItem(prefix + '.skin.css') !== null) {
    var css = localStorage.getItem(prefix + '.skin.css'),
      head = document.head || document.getElementsByTagName('head')[0],
      style = document.createElement('style');

    style.type = 'text/css';
    style.setAttribute('id', 'preDefStyle');
    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);
  }
}

if (preDefStyle != 'default') {
  $('<link class="u-predefined-style" href="' + preDefStyle + '" rel="stylesheet"></link>').insertBefore('#preDefStyle');
}

var defaults = styleSwitcher.data('defaults'),
  customColor = $.cookie(prefix + '.customColor') ? $.cookie(prefix + '.customColor') : defaults[0].customColor,
  outerSpaces = $.cookie(prefix + '.outerSpaces') ? $.cookie(prefix + '.outerSpaces') : defaults[0].outerSpaces,
  contentFont = $.cookie(prefix + '.contentFont') ? $.cookie(prefix + '.contentFont') : defaults[0].contentFont,
  headingFont = $.cookie(prefix + '.headingFont') ? $.cookie(prefix + '.headingFont') : defaults[0].headingFont,
  customClasses = $.cookie(prefix + '.customClasses') ? JSON.parse($.cookie(prefix + '.customClasses')) : {},
  customClassesKey,
  customClassesAtts = $.cookie(prefix + '.customClassesAtts') ? JSON.parse($.cookie(prefix + '.customClassesAtts')) : [],
  checkIDs = $.cookie(prefix + '.checkIDs') ? JSON.parse($.cookie(prefix + '.checkIDs')) : {},
  checkIDsKey,
  cssCol;

//Classes added
for (customClassesKey in customClasses) {
  $(customClassesKey).addClass(customClasses[customClassesKey]);
}

//Classes added (help atts)
if (customClassesAtts.length) {
  for (var i = 0; i < customClassesAtts.length; i++) {
    $(customClassesAtts[i].s).attr(customClassesAtts[i].a, customClassesAtts[i].v);
  }
}

//Check state added
for (checkIDsKey in checkIDs) {
  if ($('#' + checkIDs[checkIDsKey]).is('option')) {
    $('#' + checkIDs[checkIDsKey]).attr('selected', 'selected');
  } else {
    $('#' + checkIDs[checkIDsKey]).attr('checked', 'checked');
  }
}

var deff = $.Deferred();

function createLESS() {
  $('head').append($('<link rel="stylesheet/less">').attr('href', window.location.protocol + '//' + window.location.host + '/' + window.location.pathname.split('/')[1] + '/html/assets/include/less/themes/custom.less'));
}

function createLESSJS() {
  var script = document.createElement('script');
  script.src = window.location.protocol + '//' + window.location.host + '/' + window.location.pathname.split('/')[1] + '/html/assets/style-switcher/vendor/lessjs/less.min.js';

  var before = document.getElementsByTagName('script')[0];
  before.parentNode.insertBefore(script, before);
}

// Switcher toggle
$('.u-ss-toggler').on('click', function (e) {
  e.preventDefault();

  if (styleSwitcher.hasClass('u-ss_initialized')) {
    $(this).closest('.u-ss').toggleClass('u-ss_opened');

    return false;
  } else {
    deff.done(function () {
      less = {
        async: !0,
        env: 'development',
        relativeUrls: true,
        modifyVars: {
          '@customColor': customColor,
          '@contentFont': contentFont,
          '@headingFont': headingFont,
          '@outerSpaces': outerSpaces
        }
      }
    });

    deff.resolve(createLESS(), createLESSJS());

    var windW = $(window).width();

    if (windW <= 1400) {
      $.HSCore.components.HSModalWindow.init('#semiboxed');
    }

    $.HSCore.components.HSScrollBar.init($('.js-ss-scrollbar'));
    $.HSCore.components.HSSelect.init('.js-ss-select');
    $.HSCore.components.HSMarkupCopy.init('.js-ss-copy');
    $.HSCore.components.HSModalWindow.init('#getCSSSkin', {
      onOpen: function () {
        // var target = $(this.context.activeElement).data('content-target');

        var target = $(this[0].offsetParent.ownerDocument.activeElement).data('content-target');

        $('.custombox-content .modal-demo')
          .append('<pre id="prism"><code class="language-css"><div></div></code></pre>')
          .find('#prism code > div')
          .text($(target).html());

        Prism.highlightAll();

        $.HSCore.components.HSScrollBar.init($('.custombox-content .modal-demo'));
      },
      onClose: function () {
        $('#copyModal').mCustomScrollbar('destroy');
        $('#prism').remove();
      }
    });

    setTimeout(function () {
      styleSwitcher.addClass('u-ss_opened');

      styleSwitcher.addClass('u-ss_initialized');
    }, 100);
  }
});

$(document).on('ready', function () {
  $('head').append($('<style>').text(cssCol));

  $('body').hasClass('g-layout-boxed') || $('body').hasClass('g-layout-semiboxed') ? $('#customBG').addClass('u-ss-option_opened') : $('#customBG').addClass('u-ss-option_closed')

  if (customColor == defaults[0].customColor) {
    $('.js-ss-color').each(function () {
      var thisVal = $(this).val();

      if (JSON.parse(thisVal)[0].customColor == customColor) {
        $(this).attr('checked', 'checked');
      }
    });
  }

  //Color switcher
  $('.js-ss-color').on('change', function () {
    var $this = $(this),
      ID = $this.attr('id'),
      thisName = $this.attr('name'),
      thisVal = $this.val(),
      thisValueArr = JSON.parse(thisVal);

    less.modifyVars({
      '@customColor': thisValueArr[0].customColor,
      '@contentFont': contentFont,
      '@headingFont': headingFont,
      '@outerSpaces': outerSpaces
    });

    customColor = thisValueArr[0].customColor;
    checkIDs[thisName] = ID;
    cssCol = $('[id^="less:"]').text();

    $.cookie(prefix + '.customColor', thisValueArr[0].customColor);
    $.cookie(prefix + '.checkIDs', JSON.stringify(checkIDs));
    localStorage.setItem(prefix + '.skin.css', $('[id^="less:"]').text());
  });

  //Predefined style
  $('.js-ss-predefined-style').on('change', function () {
    var $this = $(this),
      ID = $this.children(':selected').attr('id'),
      thisName = 'predefined-style',
      thisVal = $this.val(),
      thisValueArr = JSON.parse(thisVal);

    $('.u-predefined-style').remove();
    if (thisValueArr[0].preDefStyle != 'default') {
      $('<link class="u-predefined-style" href="' + thisValueArr[0].preDefStyle + '" rel="stylesheet"></link>').insertBefore('[id^="less:"]');
    }
    // $(thisValueArr[0].checkIDs).trigger('click');

    preDefStyle = thisValueArr[0].preDefStyle;
    checkIDs = thisValueArr[0].checkIDs;
    checkIDs[thisName] = ID;

    // console.log(thisValueArr, checkIDs);

    //Check state added
    for (checkIDsKey in checkIDs) {
      if ($('#' + checkIDs[checkIDsKey]).is('option')) {
        $('#' + checkIDs[checkIDsKey]).attr('selected', 'selected');
        $('.js-ss-select').trigger('chosen:updated');
      } else {
        $('#' + checkIDs[checkIDsKey]).trigger('click').attr('checked', 'checked');
      }
    }

    $.cookie(prefix + '.preDefStyle', preDefStyle);
    $.cookie(prefix + '.checkIDs', JSON.stringify(checkIDs));
    localStorage.setItem(prefix + '.skin.css', $('[id^="less:"]').text());
  });

  //Font switcher
  $('.js-ss-font').on('change', function () {
    var $this = $(this),
      ID = $this.children(':selected').attr('id'),
      thisName = 'font',
      thisVal = $this.val(),
      thisValueArr = JSON.parse(thisVal);

    less.modifyVars({
      '@contentFont': thisValueArr[0].contentFont,
      '@customColor': customColor,
      '@headingFont': headingFont,
      '@outerSpaces': outerSpaces
    });

    contentFont = thisValueArr[0].contentFont;
    checkIDs[thisName] = ID;
    cssCol = $('[id^="less:"]').text();

    $.cookie(prefix + '.contentFont', thisValueArr[0].contentFont);
    $.cookie(prefix + '.checkIDs', JSON.stringify(checkIDs));
    localStorage.setItem(prefix + '.skin.css', $('[id^="less:"]').text());
  });

  //Heading Font switcher
  $('.js-ss-heading-font').on('change', function () {
    var $this = $(this),
      ID = $this.children(':selected').attr('id'),
      thisName = 'heading-font',
      thisVal = $this.val(),
      thisValueArr = JSON.parse(thisVal);

    less.modifyVars({
      '@headingFont': thisValueArr[0].headingFont,
      '@customColor': customColor,
      '@contentFont': contentFont,
      '@outerSpaces': outerSpaces
    });

    headingFont = thisValueArr[0].headingFont;
    checkIDs[thisName] = ID;
    cssCol = $('[id^="less:"]').text();

    $.cookie(prefix + '.headingFont', thisValueArr[0].headingFont);
    $.cookie(prefix + '.checkIDs', JSON.stringify(checkIDs));
    localStorage.setItem(prefix + '.skin.css', $('[id^="less:"]').text());
  });

  //Color picker
  $('.js-ss-color-picker').each(function () {
    $(this).spectrum({
      color: customColor ? customColor : 'transparent'
    });

    $(this).siblings('.u-ss__control').val(customColor ? customColor : 'transparent');

    $(this).on('dragstop.spectrum', function (e, color) {
      $('#customColors').find('.js-ss-color').removeAttr('checked');

      less.modifyVars({
        '@customColor': color.toHexString(),
        '@contentFont': contentFont,
        '@headingFont': headingFont,
        '@outerSpaces': outerSpaces
      });

      customColor = color.toHexString();
      cssCol = $('[id^="less:"]').text();

      $.cookie(prefix + '.customColor', color.toHexString());
      $.cookie(prefix + '.checkIDs', '');
      localStorage.setItem(prefix + '.skin.css', $('[id^="less:"]').text());

      $(this).siblings('.u-ss__control').val(customColor);
    });
  });

  $('#customColors .js-ss-color').on('change', function () {
    $('#userColor .js-ss-color-picker').spectrum('set', customColor);
    $('#userColor .js-ss-color-picker').siblings('.u-ss__control').val(customColor);
  });

  $('#userColor .u-ss__control').on('change', function () {
    var $this = $(this),
      thisVal = $this.val();

    less.modifyVars({
      '@customColor': thisVal,
      '@contentFont': contentFont,
      '@headingFont': headingFont,
      '@outerSpaces': outerSpaces
    });

    customColor = thisVal;
    cssCol = $('[id^="less:"]').text();

    $.cookie(prefix + '.customColor', thisVal);
    $.cookie(prefix + '.checkIDs', '');
    localStorage.setItem(prefix + '.skin.css', $('[id^="less:"]').text());

    $('#customColors .js-ss-color').removeAttr('checked');
    $('#userColor .js-ss-color-picker').spectrum('set', customColor);
  });

  //Classes added
  $('.js-ss-classes').on('change', function () {
    var $this = $(this),
      ID = $this.attr('id'),
      thisName = $this.attr('name'),
      values = $this.val(),
      selectors = $this.data('selectors'),
      radGroup = $this.attr('name');

    $(selectors).not('.u-ss *').removeClass($(selectors).attr('data-' + radGroup));
    $(selectors).attr('data-' + radGroup, values);
    $(selectors).not('.u-ss *').addClass(values);

    customClasses[selectors] = $(selectors).attr('class');
    customClassesAtts.push({
      s: selectors,
      a: 'data-' + radGroup,
      v: values
    });
    checkIDs[thisName] = ID;
    cssCol = $('[id^="less:"]').text();

    $.cookie(prefix + '.customClasses', JSON.stringify(customClasses));
    $.cookie(prefix + '.customClassesAtts', JSON.stringify(customClassesAtts));
    $.cookie(prefix + '.checkIDs', JSON.stringify(checkIDs));
    localStorage.setItem(prefix + '.skin.css', $('[id^="less:"]').text());
  });

  //Options
  $('.js-ss-option-open').on('click', function () {
    var $this = $(this),
      $target = $($this.data('option-target'));

    if (!$target.hasClass('u-ss-option_opened')) {
      $target.slideDown(400, function () {
        $target.removeClass('u-ss-option_closed');
        $target.addClass('u-ss-option_opened');
      });
    }
  });

  $('.js-ss-option-close').on('click', function () {
    var $this = $(this),
      $target = $($this.data('option-target')),
      $checkItem = $($this.data('check-item'));

    if (!$target.hasClass('u-ss-option_closed')) {
      $checkItem.trigger('click');

      $target.slideUp(400, function () {
        $target.removeClass('u-ss-option_opened');
        $target.addClass('u-ss-option_closed');
      });
    }
  });

  // Reset
  $('.js-ss-reset').on('click', function () {
    $.removeCookie(prefix + '.customColor');
    $.removeCookie(prefix + '.preDefStyle');
    $.removeCookie(prefix + '.outerSpaces');
    $.removeCookie(prefix + '.contentFont');
    $.removeCookie(prefix + '.headingFont');
    $.removeCookie(prefix + '.customClasses');
    $.removeCookie(prefix + '.customClassesAtts');
    $.removeCookie(prefix + '.checkIDs');
    localStorage.removeItem(prefix + '.skin.css');
    window.location.reload();
  });
});
