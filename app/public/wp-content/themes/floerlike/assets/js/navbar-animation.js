console.log('navbar-animation.js loaded');
gsap.registerPlugin(ScrollTrigger);
// ScrollTrigger.normalizeScroll(true);
document.addEventListener('DOMContentLoaded', function () {
    const navbar = document.querySelector('header>div>div:has(nav)');
    // const navbarLogo = document.querySelector('header>div>div:has(nav) .custom-logo');
    console.log('navbar:', navbar);
    if (navbar) {
        // gsap.fromTo(navbarLogo,
        //     { scale: 1.2 },
        //     {
        //         scale: 1,
        //         duration: 0.3,
        //         scrollTrigger: {
        //             trigger: "body",
        //             start: "top -80",
        //             toggleActions: "play none none reverse"
        //         }
        //     }
        // );

        gsap.fromTo(navbar,
            { "--navbar-bg-opacity": 0 },
            {
                "--navbar-bg-opacity": 1,
                duration: 0.3,
                scrollTrigger: {
                    trigger: "body",
                    start: "top -80",
                    toggleActions: "play none none reverse"
                }
            }
        );

        let lastScrollY = window.scrollY;
        const scrollTolerance = 10;
        let isMenuOpen = false;

        // Applying a transform to the navbar makes it the containing block for
        // any `position: fixed` descendants, so the Navigation block's fullscreen
        // overlay (`.wp-block-navigation__responsive-container`, which relies on
        // `position: fixed; inset: 0`) gets clipped to the navbar instead of the
        // viewport. Clear the transform while the overlay is open, and pause the
        // scroll-driven hide/show until it closes again.
        const responsiveContainer = navbar.querySelector('.wp-block-navigation__responsive-container');
        if (responsiveContainer) {
            const menuObserver = new MutationObserver(() => {
                const nowOpen = responsiveContainer.classList.contains('is-menu-open');
                if (nowOpen === isMenuOpen) {
                    return;
                }
                isMenuOpen = nowOpen;
                if (isMenuOpen) {
                    gsap.set(navbar, { clearProps: "transform" });
                }
            });
            menuObserver.observe(responsiveContainer, { attributes: true, attributeFilter: ['class'] });
        }

        const header = navbar.closest('header');

        // Distance from the top of the viewport to the navbar's resting top edge.
        // `yPercent: -100` only moves the navbar by its own height, so without this
        // extra offset a strip as tall as that distance stays on screen. Both
        // `getComputedStyle().top` and `offsetTop` ignore transforms, so the value
        // is still correct while the navbar is currently hidden -- unlike
        // getBoundingClientRect(), which would include the transform.
        const topGap = () => {
            const headerTop = header ? parseFloat(getComputedStyle(header).top) : 0;
            return (Number.isFinite(headerTop) ? headerTop : 0) + navbar.offsetTop;
        };

        ScrollTrigger.create({
            start: "top -80",
            end: "max",
            onUpdate: (self) => {
                if (isMenuOpen) {
                    return;
                }

                const currentScrollY = self.scroll();
                const delta = currentScrollY - lastScrollY;

                if (Math.abs(delta) < scrollTolerance) {
                    return;
                }

                gsap.to(navbar, {
                    yPercent: delta > 0 ? -100 : 0,
                    y: delta > 0 ? -topGap() : 0,
                    duration: 0.3,
                    ease: "power1.out"
                });

                lastScrollY = currentScrollY;
            }
        });
    }
});