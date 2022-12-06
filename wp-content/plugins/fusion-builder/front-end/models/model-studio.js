/* global fusionAppConfig, FusionApp */
var FusionPageBuilder = FusionPageBuilder || {};

( function() {

	FusionPageBuilder.Studio = Backbone.Model.extend( {

		/**
		 * {Object} - Stores current import step data.
		 */
		importData: {},

		/**
		 * Init.
		 *
		 * @since 2.0.0
		 * @return {void}
		 */
		initialize: function() {
			this.studioData    = false;
			this.studioRequest = false;
		},

		/**
		 * Gets the webfonts via AJAX.
		 *
		 * @since 2.0.0
		 * @return {void}
		 */
		getStudioData: function() {
			var self = this;

			if ( self.studioData && self.studioData ) {
				return;
			}

			if ( false !== self.studioRequest ) {
				return self.studioRequest;
			}
			return jQuery.post( fusionAppConfig.ajaxurl, { action: 'fusion_builder_load_studio_elements', fusion_load_nonce: fusionAppConfig.fusion_load_nonce }, function( data ) {
				self.studioData = data;
			}, 'json' );
		},

		/**
		 * Filter out invalid layouts, containers etc for current situation.
		 *
		 * @since 3.5
		 * @param {Object} layouts - The layouts or elements.
		 * @return {Object}
		 */
		filterLayouts: function( layouts ) {
			var plugins = 'object' === typeof FusionApp.data.plugins_active ? FusionApp.data.plugins_active : false;

			return _.filter( layouts, function( layout ) {
				var passes = true;

				// Check for plugins first.
				if ( false !== plugins && 'object' === typeof layout.plugins ) {
					_.each( layout.plugins, function( layoutPlugin ) {
						if ( ! plugins[ layoutPlugin ] ) {
							passes = false;
						}
					} );

					if ( ! passes ) {
						return false;
					}
				}

				if ( 'object' === typeof layout.locations && ! layout.locations.includes( FusionApp.data.template_category ) ) {
					return false;
				}
				return true;
			} );
		},

		initFilter: function( $sidebar ) {
			var timeouts = [],
				self     = this;

			$sidebar.find( 'li' ).off();

			$sidebar.find( 'li' ).on( 'click', function() {
				var $container     = jQuery( this ).closest( '.studio-wrapper' ).find( '.studio-imports' ),
					$templates     = $container.find( 'li.fusion-page-layout' ),
					slug           = jQuery( this ).attr( 'data-slug' ),
					counter        = 1,
					order          = [],
					$showTemplates = [],
					i;

				// Don't do filtering for active filter.
				if ( jQuery( this ).hasClass( 'current' ) ) {
					return false;
				}

				// Clear all timeouts to prevent animations still running.
				jQuery.each( timeouts, function( index, value ) {
					clearTimeout( value );
				} );

				// Remove current from active.
				$sidebar.find( 'li.current' ).removeClass( 'current' );

				// Hide all templates.
				$templates.css( { display: 'none' } ).addClass( 'hidden' );

				// Fade correct templates in.
				$templates.each( function() {
					var $template = jQuery( this );
					if ( 'undefined' === typeof $template.data( 'slug' ) ) {
						return true;
					}

					if ( 'all' === slug || -1 !== $template.data( 'slug' ).indexOf( slug ) ) {
						$template.css( { display: 'inline-block' } );
						$showTemplates.push( $template );
					}
				} );

				setTimeout( function() {
					jQuery.each( $showTemplates, function() {
						var $template = jQuery( this ),
							position  = $template.position();

						// Loop afer all have been added to get position.
						position.$el = $template;
						order.push( position );
					} );

					// Sort top to bottom.
					order.sort( self.SortByTop );

					// Reveal top to bottom.
					for ( i = 0;  i < order.length; i++ ) {
						timeouts.push(
							self.doSetTimeout( i, order, counter )
						);
						counter++;
					}
				}, 50 );

				// Add current to show it is active.
				jQuery( this ).addClass( 'current' );
			} );
		},

		/**
		 * Delay between showing items.
		 *
		 * @since 7.5
		 *
		 * @return {void}
		 */
		doSetTimeout: function( i, order, counter ) {
			setTimeout( function() {
				order[ i ].$el.removeClass( 'hidden' );
			}, counter * 50 );
		},

		/**
		 * Sort elements by vertical position.
		 *
		 * @since 7.5
		 *
		 */
		SortByTop: function( a, b ) {
			return ( ( a.top < b.top ) ? -1 : ( ( a.top > b.top ) ? 1 : 0 ) ); // eslint-disable-line no-nested-ternary
		},

		/**
		 * Lazy load images.
		 *
		 * @since 3.1
		 * @return {void}
		 */
		initLazyLoad: function( $container ) {
			var demoImages = $container.find( '.lazy-load' ),
				options    = {
					root: $container.closest( '.ui-dialog' )[ 0 ],
					rootMargin: '0px',
					threshold: 0
				},
				imageObserver;

			if ( 'IntersectionObserver' in window ) {
				imageObserver = new IntersectionObserver( function( entries, observer ) { // eslint-disable-line
					jQuery.each( entries, function( key, entry ) {
						var $demo  = jQuery( entry.target ),
							$image = $demo.find( 'img' );

						if ( 'undefined' === typeof $image.data( 'src' ) || '' === $image.data( 'src' ) || 'undefined' === $image.data( 'src' ) ) {
							imageObserver.unobserve( entry.target );
							return;
						}

						if ( entry.isIntersecting ) {
							$image.attr( 'src', $image.data( 'src' ) );

							$image.imagesLoaded().done( function() {
								$demo.removeClass( 'lazy-load' ).addClass( 'lazy-loaded' );
								$image.attr( 'alt', $image.data( 'alt' ) );
							} );

							imageObserver.unobserve( entry.target );
						}
					} );
				}, options );

				demoImages.each( function() {
					imageObserver.observe( this );
				} );
			} else {

				// IE11 fallback.
				demoImages.each( function() {
					var $demo  = jQuery( this ),
						$image = $demo.find( 'img' );

					if ( 'undefined' === typeof $image.data( 'src' ) || '' === $image.data( 'src' ) || 'undefined' === $image.data( 'src' ) ) {
						return;
					}

					$image.attr( 'src', $image.data( 'src' ) );

					$image.imagesLoaded().done( function() {
						$demo.removeClass( 'lazy-load' ).addClass( 'lazy-loaded' );
						$image.attr( 'alt', $image.data( 'alt' ) );
					} );
				} );
			}
		},

		/**
		 * Sets import data to new value.
		 *
		 * @since 3.5
		 * @param {Object} data
		 * @return {void}
		 */
		setImportData: function( data ) {
			this.importData = data;
		},

		/**
		 * Sets options.
		 *
		 * @since 3.7
		 * @param {Object} $layoutsContainer
		 * @return {void}
		 */
		setOptions: function( $layoutsContainer ) {
			var $wrapper = $layoutsContainer.closest( '.studio-wrapper' ).find( '.awb-import-options-group' ),
				self     = this,
				options  = { // Object of default values and current values.
					'load-type-replace': FusionApp.preferencesData.contentPlacement,
					'replace-pos': FusionApp.preferencesData.overWriteType,
					'dont-invert': FusionApp.preferencesData.shouldInvert,
					'do-import-images': FusionApp.preferencesData.imagesImport
				};

				jQuery.each( options, function( defaultVal, value ) {
					if ( self.ValueExists( value ) ) {
						$wrapper.find( '#' + value ).prop( 'checked', true );
					} else {
						$wrapper.find( '#' + defaultVal ).prop( 'checked', true );
					}
				} );
		},

		/**
		 * Checks if value exists.
		 *
		 * @since 3.7
		 * @param {string} item
		 * @return {void}
		 */
		ValueExists: function( item ) {
			return 'undefined' !== typeof item && '' !== item ? true : false;
		},

		/**
		 * Gets import data to new value.
		 *
		 * @since 3.5
		 * @return {Object}
		 */
		getImportData: function() {
			return this.importData;
		},

		/**
		 * Resets import data variable.
		 *
		 * @since 3.5
		 * @return {void}
		 */
		resetImportData: function() {
			this.importData = {};
		}

	} );

}( jQuery ) );
