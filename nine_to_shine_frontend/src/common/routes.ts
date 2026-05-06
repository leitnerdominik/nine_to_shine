export const routes = {
  home: `/`,
  chronik: `/chronik`,
  rankings: `/rankings`,
  imagegallery: `/imagegallery`,
  zahlungen: `/finance`,
  login: `/login`,
  signup: `/signup`,
  punishment: `/punishment`,
  admincenter: `/admincenter`,
  organizeduties: `/organizer-duties`,
  finances: `/finance`,
  financesGames: `/finance/games`,
};

export const unprotectedRoutes = [routes.login, routes.signup];
