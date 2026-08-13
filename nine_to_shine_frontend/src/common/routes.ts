export const routes = {
  home: `/`,
  chronik: `/chronik`,
  chronikEntries: `/chronik/eintraege`,
  rankings: `/rankings`,
  imagegallery: `/imagegallery`,
  zahlungen: `/finance`,
  login: `/login`,
  signup: `/signup`,
  punishment: `/chronik/strafenkatalog`,
  constitution: `/chronik/verfassung`,
  admincenter: `/admincenter`,
  organizeduties: `/organizer-duties`,
  finances: `/finance`,
  financesGames: `/finance/games`,
  duesOverview: `/finance/dues`,
};

export const unprotectedRoutes = [routes.login, routes.signup];
