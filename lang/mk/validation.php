<?php

// Generic validation messages in Macedonian. Form-specific messages live in
// the controllers (and their translations in lang/mk.json).
return [
    'accepted' => 'Полето :attribute мора да биде прифатено.',
    'email' => 'Полето :attribute мора да биде важечка адреса на е-пошта.',
    'file' => 'Полето :attribute мора да биде датотека.',
    'in' => 'Избраната вредност за :attribute не е важечка.',
    'max' => [
        'array' => 'Полето :attribute може да има најмногу :max ставки.',
        'file' => 'Датотеката :attribute може да има најмногу :max килобајти.',
        'string' => 'Полето :attribute може да има најмногу :max знаци.',
    ],
    'mimes' => 'Полето :attribute мора да биде датотека од типот: :values.',
    'extensions' => 'Полето :attribute мора да има една од следниве екстензии: :values.',
    'required' => 'Полето :attribute е задолжително.',
    'string' => 'Полето :attribute мора да биде текст.',
    'uploaded' => 'Прикачувањето на :attribute не успеа.',

    'attributes' => [
        'name' => 'име и презиме',
        'email' => 'е-пошта',
        'affiliation' => 'афилијација',
        'title' => 'наслов',
        'type' => 'тип на труд',
        'message' => 'порака',
        'manuscript' => 'ракопис',
        'forms' => 'потпишани обрасци',
        'reviewers' => 'предложени рецензенти',
        'suggested_reviewers' => 'предложени рецензенти',
        'consent' => 'изјава',
        'privacy' => 'изјава за приватност',
        'password' => 'лозинка',
        'given_name' => 'име',
        'family_name' => 'презиме',
        'academic_title' => 'звање',
        'country_code' => 'држава',
        'orcid' => 'ORCID iD',
        'department' => 'катедра',
        'city' => 'град',
        'phone' => 'телефон',
        'expertise' => 'области на експертиза',
        'locale' => 'јазик',
        'roles' => 'улоги',
    ],
];
