import User from '../models/user.js';

export async function findUserByAuth0Subject(auth0Subject) {
  return User.findOne({ where: { auth0Subject } });
}

export async function provisionUser(auth0Profile) {
  const { sub: auth0Subject, name, email, email_verified: emailVerified } = auth0Profile;

  if (!auth0Subject || !email) {
    throw new Error('O perfil retornado pelo Auth0 não contém identificador e e-mail.');
  }

  const [user, created] = await User.findOrCreate({
    where: {
      auth0Subject,
    },
    defaults: {
      name: name ?? email,
      email,
      emailVerified: emailVerified === true,
    },
  });

  if (!created) {
    const updatedProfile = {
      name: name ?? user.name ?? email,
      email,
    };

    if (typeof emailVerified === 'boolean') {
      updatedProfile.emailVerified = emailVerified;
    }

    await user.update(updatedProfile);
  }

  return user;
}
