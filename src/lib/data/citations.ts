/**
 * Single source of truth for all research citations used in EnduranceIQ.
 *
 * All DOIs verified against doi.org before inclusion.
 * Do not add inline "https://doi.org/..." strings elsewhere in the codebase —
 * import citationToLink() or CITATIONS instead.
 */

export interface Citation {
  id: string;
  label: string;
  doi: string | null;
  pubmed_id: string | null;
  /** Canonical URL: https://doi.org/<doi> or PubMed URL */
  url: string;
  strength: "Strong" | "Moderate" | "Limited";
  note?: string;
}

export const CITATIONS = {
  // ── Intensity distribution ──────────────────────────────────────────────
  seiler_2010: {
    id: "seiler_2010",
    label: "Seiler (2010)",
    doi: "10.1123/ijspp.5.3.276",
    pubmed_id: null,
    url: "https://doi.org/10.1123/ijspp.5.3.276",
    strength: "Strong",
    note: "Best practice for intensity distribution in endurance athletes. IJSPP 5(3):276.",
  },
  stoggl_sperlich_2014: {
    id: "stoggl_sperlich_2014",
    label: "Stöggl & Sperlich (2014)",
    doi: "10.3389/fphys.2014.00033",
    pubmed_id: null,
    url: "https://doi.org/10.3389/fphys.2014.00033",
    strength: "Strong",
    note: "Polarized training superiority over threshold and high-volume models.",
  },
  seiler_kjerland_2006: {
    id: "seiler_kjerland_2006",
    label: "Seiler & Kjerland (2006)",
    doi: "10.1111/j.1600-0838.2004.00418.x",
    pubmed_id: null,
    url: "https://doi.org/10.1111/j.1600-0838.2004.00418.x",
    strength: "Strong",
    note: "Distribution patterns in elite endurance athletes.",
  },
  treff_2019: {
    id: "treff_2019",
    label: "Treff et al. (2019)",
    doi: "10.3389/fphys.2019.01002",
    pubmed_id: null,
    url: "https://doi.org/10.3389/fphys.2019.01002",
    strength: "Moderate",
    note: "Session-goal vs time-in-zone classification bias.",
  },
  casado_2022: {
    id: "casado_2022",
    label: "Casado et al. (2022)",
    doi: "10.1136/bjsports-2020-103014",
    pubmed_id: null,
    url: "https://doi.org/10.1136/bjsports-2020-103014",
    strength: "Moderate",
    note: "Pyramidal vs polarized training in sub-elite marathoners.",
  },

  // ── Training load / ACWR ─────────────────────────────────────────────────
  gabbett_2016: {
    id: "gabbett_2016",
    label: "Gabbett (2016)",
    doi: "10.1136/bjsports-2015-095788",
    pubmed_id: null,
    url: "https://doi.org/10.1136/bjsports-2015-095788",
    strength: "Moderate",
    note: "Training-injury prevention paradox. ACWR popularisation.",
  },
  hulin_2016: {
    id: "hulin_2016",
    label: "Hulin et al. (2016)",
    doi: "10.1136/bjsports-2016-096283",
    pubmed_id: null,
    url: "https://doi.org/10.1136/bjsports-2016-096283",
    strength: "Moderate",
  },
  windt_2017: {
    id: "windt_2017",
    label: "Windt et al. (2017)",
    doi: "10.1136/bjsports-2016-097269",
    pubmed_id: null,
    url: "https://doi.org/10.1136/bjsports-2016-097269",
    strength: "Moderate",
  },
  banister_1991: {
    id: "banister_1991",
    label: "Banister (1991)",
    doi: null,
    pubmed_id: null,
    url: "https://www.worldcat.org/title/physiological-testing-of-the-high-performance-athlete/oclc/23392155",
    strength: "Strong",
    note: "Original TRIMP formulation. Book chapter — no DOI.",
  },

  // ── Overtraining / rest ──────────────────────────────────────────────────
  budgett_1998: {
    id: "budgett_1998",
    label: "Budgett (1998)",
    doi: "10.1136/bjsm.32.2.107",
    pubmed_id: null,
    url: "https://doi.org/10.1136/bjsm.32.2.107",
    strength: "Moderate",
    note: "Overtraining syndrome and overreaching in elite athletes.",
  },

  // ── Long run / intensity ─────────────────────────────────────────────────
  laursen_2010: {
    id: "laursen_2010",
    label: "Laursen (2010)",
    doi: "10.1111/j.1600-0838.2010.01184.x",
    pubmed_id: null,
    url: "https://doi.org/10.1111/j.1600-0838.2010.01184.x",
    strength: "Moderate",
    note: "Training for intense exercise performance: high-intensity or high-volume?",
  },

  // ── Cadence ──────────────────────────────────────────────────────────────
  heiderscheit_2011: {
    id: "heiderscheit_2011",
    label: "Heiderscheit et al. (2011)",
    doi: "10.1249/MSS.0b013e3181edf72f",
    pubmed_id: null,
    url: "https://doi.org/10.1249/MSS.0b013e3181edf72f",
    strength: "Strong",
    note: "Effects of step rate manipulation on joint mechanics during running.",
  },
  saunders_2006: {
    id: "saunders_2006",
    label: "Saunders et al. (2006)",
    doi: "10.1519/R-19655.1",
    pubmed_id: null,
    url: "https://doi.org/10.1519/R-19655.1",
    strength: "Strong",
    note: "Plyometric training for running economy; relevant to cadence intervention.",
  },

  // ── Concurrent training / interference ───────────────────────────────────
  fyfe_2014: {
    id: "fyfe_2014",
    label: "Fyfe et al. (2014)",
    doi: "10.1007/s40279-013-0131-5",
    pubmed_id: null,
    url: "https://doi.org/10.1007/s40279-013-0131-5",
    strength: "Strong",
    note: "Interference between concurrent resistance and endurance exercise.",
  },
  wilson_2012: {
    id: "wilson_2012",
    label: "Wilson et al. (2012)",
    doi: "10.1519/JSC.0b013e3182429f27",
    pubmed_id: null,
    url: "https://doi.org/10.1519/JSC.0b013e3182429f27",
    strength: "Strong",
    note: "Meta-analysis: concurrent training in endurance athletes.",
  },

  // ── Strength for runners ─────────────────────────────────────────────────
  beattie_2017: {
    id: "beattie_2017",
    label: "Beattie et al. (2017)",
    doi: "10.1519/JSC.0000000000001464",
    pubmed_id: null,
    url: "https://doi.org/10.1519/JSC.0000000000001464",
    strength: "Strong",
    note: "Effect of strength training on performance in endurance athletes. JSCR 31(1):9–23.",
  },
  blagrove_2018: {
    id: "blagrove_2018",
    label: "Blagrove et al. (2018)",
    doi: "10.1007/s40279-017-0835-7",
    pubmed_id: null,
    url: "https://doi.org/10.1007/s40279-017-0835-7",
    strength: "Strong",
    note: "Effects of strength training on physiological determinants of middle- and long-distance running.",
  },
  bourne_2017: {
    id: "bourne_2017",
    label: "Bourne et al. (2017)",
    doi: "10.1136/bjsports-2016-097237",
    pubmed_id: null,
    url: "https://doi.org/10.1136/bjsports-2016-097237",
    strength: "Strong",
    note: "Posterior chain strength and hamstring injury prevention.",
  },
  mahieu_2006: {
    id: "mahieu_2006",
    label: "Mahieu et al. (2006)",
    doi: "10.1177/0363546505282073",
    pubmed_id: null,
    url: "https://doi.org/10.1177/0363546505282073",
    strength: "Strong",
    note: "Calf raise and Achilles tendon loading / tendinopathy prevention.",
  },
  haroy_2019: {
    id: "haroy_2019",
    label: "Harøy et al. (2019)",
    doi: "10.1136/bjsports-2017-098937",
    pubmed_id: null,
    url: "https://doi.org/10.1136/bjsports-2017-098937",
    strength: "Strong",
    note: "Copenhagen plank: 41% reduction in adductor injuries in RCT.",
  },
  mujika_2010: {
    id: "mujika_2010",
    label: "Mujika (2010)",
    doi: "10.1111/j.1600-0838.2010.01187.x",
    pubmed_id: null,
    url: "https://doi.org/10.1111/j.1600-0838.2010.01187.x",
    strength: "Moderate",
    note: "Intense training: the key to optimal performance — taper strategies.",
  },

  // ── Phase 2.0 additions: taper / periodisation (F15) ─────────────────────
  bosquet_2007: {
    id: "bosquet_2007",
    label: "Bosquet et al. (2007)",
    doi: "10.1249/mss.0b013e3180383ed6",
    pubmed_id: null,
    url: "https://doi.org/10.1249/mss.0b013e3180383ed6",
    strength: "Strong",
    note: "Effects of tapering on performance: a meta-analysis. MSSE 39(8):1358–1365.",
  },
  mujika_padilla_2003: {
    id: "mujika_padilla_2003",
    label: "Mujika & Padilla (2003)",
    doi: "10.1249/01.MSS.0000074448.73931.11",
    pubmed_id: null,
    url: "https://doi.org/10.1249/01.MSS.0000074448.73931.11",
    strength: "Strong",
    note: "Scientific bases for precompetition tapering strategies. MSSE 35(7):1182–1187.",
  },
  pyne_2009: {
    id: "pyne_2009",
    label: "Pyne, Mujika & Reilly (2009)",
    doi: "10.1080/02640410902889834",
    pubmed_id: null,
    url: "https://doi.org/10.1080/02640410902889834",
    strength: "Moderate",
    note: "Peaking for optimal performance: research limitations and future directions. J Sports Sci 27(3):195–202.",
  },
  knechtle_nikolaidis_2018: {
    id: "knechtle_nikolaidis_2018",
    label: "Knechtle & Nikolaidis (2018)",
    doi: "10.3389/fphys.2018.00634",
    pubmed_id: null,
    url: "https://doi.org/10.3389/fphys.2018.00634",
    strength: "Moderate",
    note: "Physiology and pathophysiology in ultra-marathon running. Front Physiol 9:634. Phase 2.0 uses for ultra taper window.",
  },

  // ── Phase 2.0 additions: race-time prediction (F14.B) ────────────────────
  riegel_1981: {
    id: "riegel_1981",
    label: "Riegel (1981)",
    doi: null,
    pubmed_id: null,
    url: "https://www.americanscientist.org/article/athletic-records-and-human-endurance",
    strength: "Moderate",
    note: "Athletic records and performance. American Scientist 69(3):285–290. Pre-DOI; source is the journal page. Origin of the Riegel pace-distance exponent (≈1.06) used for finish-time prediction.",
  },
  vickers_vertosick_2016: {
    id: "vickers_vertosick_2016",
    label: "Vickers & Vertosick (2016)",
    doi: "10.1186/s13102-016-0052-y",
    pubmed_id: null,
    url: "https://doi.org/10.1186/s13102-016-0052-y",
    strength: "Moderate",
    note: "An empirical study of race times in recreational endurance runners. BMC Sports Sci Med Rehabil 8:26. Modernises Riegel's exponent for recreational runners.",
  },
  daniels_2014_vdot: {
    id: "daniels_2014_vdot",
    label: "Daniels (2014)",
    doi: null,
    pubmed_id: null,
    url: "https://us.humankinetics.com/products/daniels-running-formula-3rd-edition",
    strength: "Moderate",
    note: "Daniels' Running Formula, 3rd ed. Human Kinetics. Book — no DOI. Source of the VDOT race-equivalency table used as the cross-check on Riegel predictions.",
  },

  // ── Phase 2.0 additions: training-stress monitoring (F1, F2) ─────────────
  foster_2001: {
    id: "foster_2001",
    label: "Foster et al. (2001)",
    doi: "10.1519/00124278-200102000-00019",
    pubmed_id: null,
    url: "https://doi.org/10.1519/00124278-200102000-00019",
    strength: "Strong",
    note: "A new approach to monitoring exercise training. JSCR 15(1):109–115. Session-RPE × duration training-load methodology.",
  },
  karvonen_1957: {
    id: "karvonen_1957",
    label: "Karvonen, Kentala & Mustala (1957)",
    doi: null,
    pubmed_id: "13470504",
    url: "https://pubmed.ncbi.nlm.nih.gov/13470504/",
    strength: "Strong",
    note: "The effects of training on heart rate; a longitudinal study. Ann Med Exp Biol Fenn 35(3):307–315. Origin of the heart-rate reserve (HRR) method used in F8 RPE↔HR mapping.",
  },
} satisfies Record<string, Citation>;

export type CitationId = keyof typeof CITATIONS;

export function citationToLink(id: CitationId): { label: string; href: string } {
  const c = CITATIONS[id];
  return { label: c.label, href: c.url };
}
