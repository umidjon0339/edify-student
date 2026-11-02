"use client";

import LatexRenderer from "@/components/LatexRenderer";

/**
 * A reference panel of standard SAT Math formulas — public, factual
 * mathematical content written from scratch (original wording/grouping), NOT
 * a reproduction of College Board's printed reference sheet or of any other
 * study site's formula-sheet graphic (both are copyrighted layouts; the
 * underlying formulas themselves are standard public-domain math facts, free
 * to restate). See docs/SAT_QUIZ.md.
 *
 * 2026-11-02: expanded from the College-Board-provided set alone (geometry +
 * angle facts) to the FULL set of formulas the digital SAT Math section
 * actually draws on but does NOT print for you — lines, quadratics,
 * exponents/radicals, trig, sequences, growth/interest, circles, stats — so
 * grouped under headings and scrollable, rather than one flat list.
 */

interface FormulaItem {
  label: string;
  latex: string;
  /** Small muted line under the formula — what the variables mean, or a case split. */
  note?: string;
}
interface FormulaGroup {
  title: string;
  items: FormulaItem[];
}

const GROUPS: FormulaGroup[] = [
  {
    title: "Lines",
    items: [
      { label: "Slope-intercept form", latex: "$y = mx + b$", note: "$m$ = slope, $b$ = $y$-intercept" },
      { label: "Point-slope form", latex: "$y - y_1 = m(x - x_1)$", note: "point $(x_1, y_1)$ on the line" },
      { label: "Standard form", latex: "$ax + by = c$", note: "slope $= -a/b$, $y$-intercept $= c/b$, $x$-intercept $= c/a$" },
      { label: "Slope formula", latex: "$m = \\dfrac{y_2 - y_1}{x_2 - x_1}$" },
      { label: "Parallel lines", latex: "$m_1 = m_2$" },
      { label: "Perpendicular lines", latex: "$m_1 m_2 = -1$" },
      { label: "Midpoint", latex: "$M = \\left(\\dfrac{x_1+x_2}{2},\\ \\dfrac{y_1+y_2}{2}\\right)$" },
      { label: "Distance between two points", latex: "$d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$" },
    ],
  },
  {
    title: "Quadratics",
    items: [
      { label: "Factored form", latex: "$y = a(x-p)(x-q)$", note: "$x$-intercepts: $x=p$ or $x=q$" },
      { label: "Vertex form", latex: "$y = a(x-h)^2 + k$", note: "vertex $(h,\\,k)$" },
      { label: "Standard form", latex: "$y = ax^2 + bx + c$" },
      { label: "Vertex, from standard form", latex: "$x = -\\dfrac{b}{2a}$", note: "the vertex's $x$-coordinate" },
      { label: "Quadratic formula", latex: "$x = \\dfrac{-b \\pm \\sqrt{b^2-4ac}}{2a}$" },
      { label: "Discriminant", latex: "$D = b^2 - 4ac$", note: "$D>0$: two real roots · $D=0$: one real root · $D<0$: no real roots" },
    ],
  },
  {
    title: "Exponents & radicals",
    items: [
      { label: "Product of powers", latex: "$x^a x^b = x^{a+b}$" },
      { label: "Quotient of powers", latex: "$\\dfrac{x^a}{x^b} = x^{a-b}$" },
      { label: "Power of a power", latex: "$(x^a)^b = x^{ab}$" },
      { label: "Power of a product", latex: "$(xy)^a = x^a y^a$" },
      { label: "Negative exponent", latex: "$x^{-a} = \\dfrac{1}{x^a}$" },
      { label: "Zero exponent", latex: "$x^0 = 1$", note: "$x \\neq 0$" },
      { label: "Fractional exponent", latex: "$x^{a/b} = \\sqrt[b]{x^a}$" },
      { label: "Product under a radical", latex: "$\\sqrt{xy} = \\sqrt{x}\\sqrt{y}$" },
      { label: "Quotient under a radical", latex: "$\\sqrt{\\dfrac{x}{y}} = \\dfrac{\\sqrt{x}}{\\sqrt{y}}$" },
    ],
  },
  {
    title: "Trigonometry",
    items: [
      { label: "Sine", latex: "$\\sin\\alpha = \\dfrac{\\text{opposite}}{\\text{hypotenuse}}$" },
      { label: "Cosine", latex: "$\\cos\\alpha = \\dfrac{\\text{adjacent}}{\\text{hypotenuse}}$" },
      { label: "Tangent", latex: "$\\tan\\alpha = \\dfrac{\\text{opposite}}{\\text{adjacent}}$" },
      { label: "Cofunction identities", latex: "$\\sin(90°-\\alpha) = \\cos\\alpha,\\quad \\cos(90°-\\alpha) = \\sin\\alpha$" },
      { label: "Pythagorean identity", latex: "$\\sin^2\\alpha + \\cos^2\\alpha = 1$" },
      { label: "30° in radians", latex: "$30° = \\dfrac{\\pi}{6}$" },
      { label: "45° in radians", latex: "$45° = \\dfrac{\\pi}{4}$" },
      { label: "60° in radians", latex: "$60° = \\dfrac{\\pi}{3}$" },
      { label: "Common Pythagorean triples", latex: "$3\\text{-}4\\text{-}5,\\ \\ 6\\text{-}8\\text{-}10,\\ \\ 5\\text{-}12\\text{-}13$" },
    ],
  },
  {
    title: "Area, circumference & angles",
    items: [
      { label: "Circle area", latex: "$A = \\pi r^2$" },
      { label: "Circle circumference", latex: "$C = 2\\pi r$" },
      { label: "Rectangle area", latex: "$A = lw$" },
      { label: "Rectangle perimeter", latex: "$P = 2(l+w)$" },
      { label: "Parallelogram area", latex: "$A = bh$" },
      { label: "Triangle area", latex: "$A = \\tfrac{1}{2}bh$" },
      { label: "Pythagorean theorem", latex: "$a^2 + b^2 = c^2$" },
      { label: "Arc length", latex: "$\\dfrac{\\theta}{360°}\\cdot 2\\pi r$" },
      { label: "Sector area", latex: "$\\dfrac{\\theta}{360°}\\cdot \\pi r^2$" },
      { label: "Degrees in a circle", latex: "$360°$" },
      { label: "Radians in a circle", latex: "$2\\pi$" },
      { label: "Sum of a triangle's angles", latex: "$180°$" },
      { label: "Sum of a quadrilateral's angles", latex: "$360°$" },
    ],
  },
  {
    title: "Special right triangles",
    items: [
      { label: "45°-45°-90° triangle", latex: "$x,\\ x,\\ x\\sqrt{2}$", note: "legs $x$, $x$; hypotenuse $x\\sqrt{2}$" },
      { label: "30°-60°-90° triangle", latex: "$x,\\ x\\sqrt{3},\\ 2x$", note: "short leg $x$; long leg $x\\sqrt{3}$; hypotenuse $2x$" },
    ],
  },
  {
    title: "Solids — volume & surface area",
    items: [
      { label: "Rectangular prism volume", latex: "$V = lwh$" },
      { label: "Rectangular prism surface area", latex: "$SA = 2(lw + lh + wh)$" },
      { label: "Cylinder volume", latex: "$V = \\pi r^2 h$" },
      { label: "Cylinder surface area", latex: "$SA = 2\\pi r(r+h)$" },
      { label: "Sphere volume", latex: "$V = \\tfrac{4}{3}\\pi r^3$" },
      { label: "Cone volume", latex: "$V = \\tfrac{1}{3}\\pi r^2 h$" },
      { label: "Pyramid volume", latex: "$V = \\tfrac{1}{3}lwh$" },
    ],
  },
  {
    title: "Circles & complex numbers",
    items: [
      { label: "Standard form of a circle", latex: "$(x-h)^2 + (y-k)^2 = r^2$", note: "center $(h,\\,k)$, radius $r$" },
      { label: "Imaginary unit", latex: "$i^2 = -1$", note: "$i = \\sqrt{-1}$" },
    ],
  },
  {
    title: "Sequences & series",
    items: [
      { label: "Arithmetic sequence", latex: "$a_n = a_1 + (n-1)d$" },
      { label: "Arithmetic series", latex: "$S_n = \\dfrac{n}{2}(a_1 + a_n)$" },
      { label: "Geometric sequence", latex: "$a_n = a_1 r^{\\,n-1}$" },
      { label: "Geometric series", latex: "$S_n = a_1 \\dfrac{1-r^n}{1-r}$" },
    ],
  },
  {
    title: "Rates, growth & interest",
    items: [
      { label: "Distance, rate, time", latex: "$d = rt$" },
      { label: "Direct variation", latex: "$y = kx$" },
      { label: "Inverse variation", latex: "$y = \\dfrac{k}{x}$" },
      { label: "Simple interest", latex: "$A = P(1+rt)$" },
      { label: "Compound interest", latex: "$A = P\\left(1+\\dfrac{r}{n}\\right)^{nt}$" },
      { label: "Exponential growth/decay", latex: "$A = P \\cdot B^{\\,t/n}$", note: "$B$ = growth/decay factor per period" },
    ],
  },
  {
    title: "Algebra facts",
    items: [
      { label: "Difference of squares", latex: "$x^2 - y^2 = (x+y)(x-y)$" },
      { label: "Absolute value equation", latex: "$|x - c| = d \\;\\Rightarrow\\; x = c \\pm d$" },
      { label: "Absolute value definition", latex: "$|x| = \\begin{cases} x & x \\ge 0 \\\\ -x & x < 0 \\end{cases}$" },
    ],
  },
  {
    title: "Statistics & probability",
    items: [
      { label: "Average (mean)", latex: "$\\bar{x} = \\dfrac{\\text{sum of values}}{\\text{number of values}}$" },
      { label: "Mean of two numbers", latex: "$\\dfrac{a+b}{2}$" },
      { label: "Probability of an event", latex: "$P(E) = \\dfrac{\\text{favorable outcomes}}{\\text{total outcomes}}$" },
    ],
  },
];

function FormulaCard({ item }: { item: FormulaItem }) {
  return (
    <div className="rounded-m3-md bg-surface-container-lowest px-3 py-2">
      <div className="text-[11px] font-semibold text-on-surface-variant">{item.label}</div>
      <div className="mt-0.5 text-[14px] font-bold text-on-surface">
        <LatexRenderer latex={item.latex} />
      </div>
      {item.note && (
        <div className="mt-0.5 text-[10.5px] leading-snug text-on-surface-variant/80">
          <LatexRenderer latex={item.note} />
        </div>
      )}
    </div>
  );
}

export default function SatReferenceSheet() {
  return (
    <div className="max-h-[65vh] overflow-y-auto pr-1 s-scroll">
      {GROUPS.map((group) => (
        <div key={group.title} className="mb-4 last:mb-0">
          <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-primary">{group.title}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <FormulaCard key={item.label} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
