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
                    duration: 0.3,
                    ease: "power1.out"
                });

                lastScrollY = currentScrollY;
            }
        });
    }
});