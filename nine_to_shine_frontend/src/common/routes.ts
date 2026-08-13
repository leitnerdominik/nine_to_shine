export const routes = {
  home: `/`,
  info: `/info`,
  chronikEntries: `/info/eintraege`,
  rankings: `/rankings`,
  imagegallery: `/imagegallery`,
  zahlungen: `/finance`,
  login: `/login`,
  signup: `/signup`,
  punishment: `/info/strafenkatalog`,
  constitution: `/info/verfassung`,
  admincenter: `/admincenter`,
  organizeduties: `/organizer-duties`,
  finances: `/finance`,
  financesGames: `/finance/games`,
  duesOverview: `/finance/dues`,
};

export const unprotectedRoutes = [routes.login, routes.signup];
